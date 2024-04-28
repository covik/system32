# syntax=docker/dockerfile:1
FROM pulumi/pulumi-base:3.113.2@sha256:910810ad3aad10952151af90dad182bbd9fca61a9480a1ba030d95200bdd4c79 AS pulumi

FROM scratch AS binaries
COPY --from=pulumi /pulumi/bin/pulumi /pulumi/pulumi
COPY --from=pulumi /pulumi/bin/pulumi-language-nodejs /pulumi/pulumi-language-nodejs

FROM node:21.7.3-bullseye-slim@sha256:788417c15fd7e0fde36a592e70c06fdb9b0a553733ad036e118ece9950d0d35e AS base
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
