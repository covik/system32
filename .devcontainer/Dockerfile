# syntax=docker/dockerfile:1
FROM pulumi/pulumi-base:3.133.0@sha256:c5720aa54ac4a9bf67b65e88c0adbc2d074f7821aea3066795469da7be5acd03 AS pulumi
FROM bitnami/kubectl:1.31.1@sha256:27e5f500a2de2ba249a159c4af0b075500ad8a1afaa59ba1edf09bf83c656fd4 AS kubectl

FROM scratch AS binaries
COPY --from=kubectl /opt/bitnami/kubectl/bin/kubectl /kubectl
COPY --from=pulumi /pulumi/bin/pulumi /pulumi/pulumi
COPY --from=pulumi /pulumi/bin/pulumi-language-nodejs /pulumi/pulumi-language-nodejs

FROM node:22.9.0-bookworm-slim@sha256:903eaf1ae555002624d07066b7ce506dc2fb67b6da3121255b40ff4dc8e7e1b8 AS base
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
ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=$USER_UID
COPY --from=binaries /kubectl /usr/local/bin/kubectl
COPY --from=binaries /pulumi /usr/local/bin
RUN deluser --remove-home node \
    && groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID --create-home $USERNAME --shell /bin/bash \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

USER $USERNAME
ENV YARN_CACHE_FOLDER=/home/$USERNAME/.cache/.yarn \
    PULUMI_HOME=/home/$USERNAME/.pulumi
RUN mkdir /home/$USERNAME/.docker \
    && mkdir -p /home/$USERNAME/.cache/JetBrains  \
    && mkdir -p $YARN_CACHE_FOLDER \
    && mkdir -p $PULUMI_HOME \
    && git config --global commit.gpgsign true


FROM base AS deps
WORKDIR /deps
COPY yarn.lock .
COPY package.json .
RUN yarn install --frozen-lockfile --ignore-scripts

FROM dev AS ci
USER root
WORKDIR /home/$USERNAME/app
COPY --from=deps /deps/node_modules ./node_modules
COPY Pulumi.yaml .
RUN pulumi plugin install \
    && sudo chown -R $USERNAME:$USERNAME $PULUMI_HOME
COPY . .
RUN yarn build
USER $USERNAME