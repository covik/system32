# syntax=docker/dockerfile:1@sha256:b6afd42430b15f2d2a4c5a02b919e98a525b785b1aaff16747d2f623364e39b6

FROM pulumi/pulumi-base:3.220.0@sha256:33fb80b9e3edb5063a7287ed4178ce5e360bbcf526dbe18b9c99265a9e5891ee AS pulumi
FROM bitnami/kubectl:1.33.0@sha256:0f6b5088710f1c6d2d41f5e19a15663b7fef07d89699247aaaad92975be7eed6 AS kubectl

FROM scratch AS binaries
COPY --from=kubectl /opt/bitnami/kubectl/bin/kubectl /kubectl
COPY --from=pulumi /pulumi/bin/pulumi /pulumi/pulumi
COPY --from=pulumi /pulumi/bin/pulumi-language-nodejs /pulumi/pulumi-language-nodejs

FROM node:24.13.1-bookworm-slim@sha256:a81a03dd965b4052269a57fac857004022b522a4bf06e7a739e25e18bce45af2 AS base
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
        vim \
        watch \
        wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && corepack enable

FROM base AS dev
ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=$USER_UID
ENV PULUMI_HOME=/home/$USERNAME/.pulumi
COPY --from=binaries /kubectl /usr/local/bin/kubectl
COPY --from=binaries /pulumi /usr/local/bin
RUN deluser --remove-home node \
    && groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID --create-home $USERNAME --shell /bin/bash \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && mkdir -p \
      /home/$USERNAME/.docker \
      /home/$USERNAME/.cache/JetBrains \
      /home/$USERNAME/.cache/JetBrains/RemoteDev/dist \
      /home/$USERNAME/.config/JetBrains \
      /home/$USERNAME/.local/share/JetBrains \
      $PULUMI_HOME \
    && chown -R $USERNAME:$USERNAME /home/$USERNAME
USER $USERNAME
RUN git config --global commit.gpgsign true


FROM base AS deps
WORKDIR /deps
COPY pnpm-lock.yaml .
COPY package.json .
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS ci
USER root
ENV PULUMI_HOME=/root/.pulumi
COPY --from=binaries /kubectl /usr/local/bin/kubectl
COPY --from=binaries /pulumi /usr/local/bin
WORKDIR /app
COPY --from=deps /deps/node_modules ./node_modules
COPY Pulumi.yaml .
RUN pulumi plugin install \
    && sudo chown -R $USERNAME:$USERNAME $PULUMI_HOME
COPY . .
RUN pnpm build
