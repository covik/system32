# syntax=docker/dockerfile:1
FROM pulumi/pulumi-base:3.127.0@sha256:ef12a0d0b3f598af8a82ba7bfbfb892004adfc2d6b8ee69f5535b73359eed396 AS pulumi
FROM bitnami/kubectl:1.30.3@sha256:309ff01e5ebffeb892cd03e50449d3e73a8b64cc7fb93ed228b42ec7db064608 AS kubectl

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
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && mkdir /home/$USERNAME/.docker \
    && echo "{}" > /home/$USERNAME/.docker/config.json

USER $USERNAME
RUN mkdir ~/.cache
