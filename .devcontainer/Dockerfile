# syntax=docker/dockerfile:1

FROM pulumi/pulumi-base:3.142.0@sha256:8a6b879150641d6d22a2d85cf05ed5eaf2af1938074b3d2ba25402af2d8eaf12 AS pulumi
FROM bitnami/kubectl:1.31.1@sha256:27e5f500a2de2ba249a159c4af0b075500ad8a1afaa59ba1edf09bf83c656fd4 AS kubectl

FROM scratch AS binaries
COPY --from=kubectl /opt/bitnami/kubectl/bin/kubectl /kubectl
COPY --from=pulumi /pulumi/bin/pulumi /pulumi/pulumi
COPY --from=pulumi /pulumi/bin/pulumi-language-nodejs /pulumi/pulumi-language-nodejs

FROM node:22.11.0-bookworm-slim@sha256:4b44c32c9f3118d60977d0dde5f758f63c4f9eac8ddee4275277239ec600950f AS base
ENV TERM="xterm"
RUN unlink /usr/local/bin/npm \
    && apt-get update \
    && apt-get --no-install-recommends install -y \
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
ENV YARN_CACHE_FOLDER=/home/$USERNAME/.cache/.yarn \
    PULUMI_HOME=/home/$USERNAME/.pulumi
COPY --from=binaries /kubectl /usr/local/bin/kubectl
COPY --from=binaries /pulumi /usr/local/bin
RUN deluser --remove-home node \
    && groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID --create-home $USERNAME --shell /bin/bash \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && mkdir -p /home/$USERNAME/.docker /home/$USERNAME/.cache/JetBrains/RemoteDev/dist $YARN_CACHE_FOLDER $PULUMI_HOME \
    && chown -R $USERNAME:$USERNAME /home/$USERNAME
USER $USERNAME
RUN git config --global commit.gpgsign true


FROM base AS deps
WORKDIR /deps
COPY yarn.lock .
COPY package.json .
RUN yarn install --frozen-lockfile --ignore-scripts

FROM base AS ci
USER root
ENV YARN_CACHE_FOLDER=/root/.cache/.yarn \
    PULUMI_HOME=/root/.pulumi
COPY --from=binaries /kubectl /usr/local/bin/kubectl
COPY --from=binaries /pulumi /usr/local/bin
WORKDIR /app
COPY --from=deps /deps/node_modules ./node_modules
COPY Pulumi.yaml .
RUN pulumi plugin install \
    && sudo chown -R $USERNAME:$USERNAME $PULUMI_HOME
COPY . .
RUN yarn build
