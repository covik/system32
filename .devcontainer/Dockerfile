# syntax=docker/dockerfile:1
FROM pulumi/pulumi-base:3.129.0@sha256:1b0328c7468da9790e01ac6300046f0017ac5db695b45267f20ff1f0f1d32bb5 AS pulumi
FROM bitnami/kubectl:1.31.0@sha256:44f99aa45e3410dae8e288f43800daa8a1bdb4cac204dad1de59c94f9c999bde AS kubectl

FROM scratch AS binaries
COPY --from=kubectl /opt/bitnami/kubectl/bin/kubectl /kubectl
COPY --from=pulumi /pulumi/bin/pulumi /pulumi/pulumi
COPY --from=pulumi /pulumi/bin/pulumi-language-nodejs /pulumi/pulumi-language-nodejs

FROM node:21.7.3-bullseye-slim@sha256:50adaf5a166e4e3dc01e77e9bdb4c35e34ef32a1e9e26200019cddb2b154fb34 AS base
# avoid warnings like "tput: No value for $TERM and no -T specified"
ENV TERM="xterm"
RUN unlink /usr/local/bin/npm
RUN apt-get update && apt-get --no-install-recommends install -y \
  ca-certificates \
  curl \
  git \
  gnupg2 \
  openssh-client \
  sudo \
  watch \
  wget \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get clean

FROM base AS dev
WORKDIR /fms-infrastructure
ENV YARN_CACHE_FOLDER=/fms-infrastructure/tmp/Yarn \
    PULUMI_HOME=/fms-infrastructure/tmp/Pulumi \
    KUBECONFIG=/fms-infrastructure/tmp/kubeconfig.yml
COPY --from=binaries /kubectl /usr/local/bin/kubectl
COPY --from=binaries /pulumi /usr/local/bin
RUN deluser --remove-home node

ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID --create-home $USERNAME --shell /bin/bash \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

USER $USERNAME
RUN mkdir ~/.cache && \
    mkdir ~/.docker && \
    git config --global commit.gpgsign true
