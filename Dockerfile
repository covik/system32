# syntax=docker/dockerfile:1
FROM pulumi/pulumi-base:3.70.0@sha256:ea246633870536dbec2e77cc4cb2d229149ab7538b55de138e32fffa29b0866a AS pulumi

FROM scratch AS binaries
COPY --from=pulumi /pulumi/bin/pulumi /pulumi/pulumi
COPY --from=pulumi /pulumi/bin/pulumi-language-nodejs /pulumi/pulumi-language-nodejs

FROM node:20-bullseye-slim@sha256:dc1906714d1993d291e1e7b5f236291236b0a0b6dfacdb164e4a9ea44d09c52e AS base
# avoid warnings like "tput: No value for $TERM and no -T specified"
ENV TERM="xterm"
RUN unlink /usr/local/bin/npm
RUN mkdir /tmp/.yarn /tmp/.pulumi
ENV YARN_CACHE_FOLDER="/tmp/.yarn" \
    PULUMI_HOME="/tmp/.pulumi"
WORKDIR /src
RUN apt-get update && apt-get --no-install-recommends install -y \
  ca-certificates \
  curl \
  git \
  wget \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get clean

FROM base AS dependencies
WORKDIR /dependencies
COPY package.json .
COPY yarn.lock .
RUN --mount=type=bind,target=/usr/local/bin/pulumi,source=/pulumi/bin/pulumi,from=pulumi \
    yarn --frozen-lockfile

FROM base AS local-environment
ENV YARN_CACHE_FOLDER=/src/tmp/Yarn \
    PULUMI_HOME=/src/tmp/Pulumi
ENV PULUMI_BACKEND_URL=file://${PULUMI_HOME} \
    PULUMI_CONFIG_PASSPHRASE=""
COPY --from=binaries /pulumi /usr/local/bin
RUN groupadd --gid 965 docker && \
    usermod -aG docker node
USER node
