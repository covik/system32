# syntax=docker/dockerfile:1
FROM pulumi/pulumi-base:3.75.0@sha256:6ac0b5a7e1f56a0d5b59eab4922371c5f336e01b788e0daa4b4d0130a7c7368e AS pulumi

FROM scratch AS binaries
COPY --from=pulumi /pulumi/bin/pulumi /pulumi/pulumi
COPY --from=pulumi /pulumi/bin/pulumi-language-nodejs /pulumi/pulumi-language-nodejs

FROM node:20.4.0-bullseye-slim@sha256:77360666adb6622d13d0f32786185b7ddc5e5cd4a9c4140097ee7fdd9b3db527 AS base
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
