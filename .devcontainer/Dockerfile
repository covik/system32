# syntax=docker/dockerfile:1

# Stage 1: Pulumi
FROM pulumi/pulumi-base:3.134.0@sha256:250a37edc7ca71353e9157277bfc3506c6a857b1dfac2a10e76a3ab06a9c1920 AS pulumi

# Stage 2: Kubectl
FROM bitnami/kubectl:1.31.1@sha256:27e5f500a2de2ba249a159c4af0b075500ad8a1afaa59ba1edf09bf83c656fd4 AS kubectl

# Stage 3: Binaries
FROM scratch AS binaries
COPY --from=kubectl /opt/bitnami/kubectl/bin/kubectl /kubectl
COPY --from=pulumi /pulumi/bin/pulumi /pulumi/pulumi
COPY --from=pulumi /pulumi/bin/pulumi-language-nodejs /pulumi/pulumi-language-nodejs

# Stage 4: Base Node Image
FROM node:22.9.0-bookworm-slim@sha256:903eaf1ae555002624d07066b7ce506dc2fb67b6da3121255b40ff4dc8e7e1b8 AS base

# Set environment variable early to maximize cache hits
ENV TERM="xterm"

# Combine RUN commands to reduce layers
RUN unlink /usr/local/bin/npm && \
    apt-get update && \
    apt-get --no-install-recommends install -y \
      ca-certificates \
      curl \
      git \
      gnupg2 \
      openssh-client \
      sudo \
      watch \
      wget && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Stage 5: Development Environment
FROM base AS dev

# Define build arguments with default values
ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Set environment variables using build arguments
ENV YARN_CACHE_FOLDER=/home/$USERNAME/.cache/.yarn \
    PULUMI_HOME=/home/$USERNAME/.pulumi

# Consolidate COPY commands
COPY --from=binaries /kubectl /usr/local/bin/kubectl
COPY --from=binaries /pulumi /usr/local/bin

# Combine user creation and setup into a single RUN command
RUN deluser --remove-home node && \
    groupadd --gid $USER_GID $USERNAME && \
    useradd --uid $USER_UID --gid $USER_GID --create-home $USERNAME --shell /bin/bash && \
    echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME && \
    chmod 0440 /etc/sudoers.d/$USERNAME && \
    mkdir -p /home/$USERNAME/.docker /home/$USERNAME/.cache/JetBrains $YARN_CACHE_FOLDER $PULUMI_HOME

# Switch to the new user
USER $USERNAME

# Configure Git
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