FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:79dc0a2abec8743065a7b43774f9301f18c1a6f69702acd0010b9b06d9789041
COPY --from=pulumi/pulumi-base:3.276.0@sha256:a444a865ac1b96ea1f58f742123426a1e772c8a1aad3e8a98048662e67daf82a \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
