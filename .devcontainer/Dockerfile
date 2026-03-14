# syntax=docker/dockerfile:1@sha256:b6afd42430b15f2d2a4c5a02b919e98a525b785b1aaff16747d2f623364e39b6

FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:21f15d367bfc5ceadabb9989be48029cba1e6bd80da323405232614a267a9c45 AS base
FROM pulumi/pulumi-base:3.224.0@sha256:abb7534a5714a7f24d63d2648a0f6bf7701095807887ff3e77b8a7b18148c475 AS pulumi

FROM scratch AS binaries
COPY --from=pulumi /pulumi/bin/pulumi /pulumi/pulumi
COPY --from=pulumi /pulumi/bin/pulumi-language-nodejs /pulumi/pulumi-language-nodejs

FROM base AS dev
COPY --from=binaries /pulumi /usr/local/bin

FROM base AS deps
WORKDIR /deps
COPY pnpm-lock.yaml .
COPY package.json .
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS ci
USER root
ENV PULUMI_HOME=/root/.pulumi
COPY --from=binaries /pulumi /usr/local/bin
WORKDIR /app
COPY --from=deps /deps/node_modules ./node_modules
COPY Pulumi.yaml .
RUN pulumi plugin install \
    && sudo chown -R $USERNAME:$USERNAME $PULUMI_HOME
COPY . .
RUN pnpm build
