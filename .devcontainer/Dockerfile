# syntax=docker/dockerfile:1
FROM pulumi/pulumi-base:3.76.1@sha256:e360b457d3bc63dfa30b177b92e4611f8e153e8cf4d3006cc95fdb4b8ea0d21d AS pulumi

FROM scratch AS binaries
COPY --from=pulumi /pulumi/bin/pulumi /pulumi/pulumi
COPY --from=pulumi /pulumi/bin/pulumi-language-nodejs /pulumi/pulumi-language-nodejs

FROM node:20.5.0-bullseye-slim@sha256:45dbc40906607e48873d26caa1a968f1a5187dd5e78e0e47205eea15393fd9c3 AS base
# avoid warnings like "tput: No value for $TERM and no -T specified"
ENV TERM="xterm"
RUN unlink /usr/local/bin/npm
RUN apt-get update && apt-get --no-install-recommends install -y \
  ca-certificates \
  curl \
  git \
  wget \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get clean

FROM base AS dev
WORKDIR /src
ENV YARN_CACHE_FOLDER=/src/tmp/Yarn \
    PULUMI_HOME=/src/tmp/Pulumi
COPY --from=binaries /pulumi /usr/local/bin
