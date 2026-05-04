FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:e66ed141c99e4190bf9dbf56db59f46f98cf172a341dfdd601ae6a78b23abbb3
COPY --from=pulumi/pulumi-base:3.234.0@sha256:9be92c203cda6d9e10cc6d836c1220bebb0b9fe6a3c295a5239d66db9e4b37c7 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
