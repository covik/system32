# syntax=docker/dockerfile:1
FROM pulumi/pulumi-base:3.72.0@sha256:a4f0182b823c15a3802482b5e4ec28e0cffcf2e43b2eb7b35b3d4deaf546c795 AS pulumi

FROM scratch AS binaries
COPY --from=pulumi /pulumi/bin/pulumi /pulumi/pulumi
COPY --from=pulumi /pulumi/bin/pulumi-language-nodejs /pulumi/pulumi-language-nodejs

FROM node:20-bullseye-slim@sha256:4c4d1930c335191ebcf049eec6a4d35571b1fb9468ab0b8a403724c1a6d23f58 AS base
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
