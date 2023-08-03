# syntax=docker/dockerfile:1
FROM pulumi/pulumi-base:3.76.1@sha256:e360b457d3bc63dfa30b177b92e4611f8e153e8cf4d3006cc95fdb4b8ea0d21d AS pulumi

FROM scratch AS binaries
COPY --from=pulumi /pulumi/bin/pulumi /pulumi/pulumi
COPY --from=pulumi /pulumi/bin/pulumi-language-nodejs /pulumi/pulumi-language-nodejs

FROM node:20.5.0-bullseye-slim@sha256:55571ebc48f4dfecfb4d6ec0a056a042ac32ed1ebea44d0fedd78088709b9948 AS base
# avoid warnings like "tput: No value for $TERM and no -T specified"
ENV TERM="xterm"
RUN unlink /usr/local/bin/npm
RUN apt-get update && apt-get --no-install-recommends install -y \
  ca-certificates \
  curl \
  git \
  openssh-client \
  watch \
  wget \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get clean

FROM base AS dev
WORKDIR /fms-infrastructure
ENV YARN_CACHE_FOLDER=/fms-infrastructure/tmp/Yarn \
    PULUMI_HOME=/fms-infrastructure/tmp/Pulumi
COPY --from=binaries /pulumi /usr/local/bin
USER node
