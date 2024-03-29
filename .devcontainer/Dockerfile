# syntax=docker/dockerfile:1
FROM pulumi/pulumi-base:3.112.0@sha256:9069dd51191325399b5ee9527cd0198701b98f90a8df7e48fd398bf176118e30 AS pulumi

FROM scratch AS binaries
COPY --from=pulumi /pulumi/bin/pulumi /pulumi/pulumi
COPY --from=pulumi /pulumi/bin/pulumi-language-nodejs /pulumi/pulumi-language-nodejs

FROM node:21.7.1-bullseye-slim@sha256:eacf88f50e8c5b5f9e3ff757a1ca078c2e249d601cb9ac90b515932a09164e74 AS base
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
RUN mkdir ~/.cache
