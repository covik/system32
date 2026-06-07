FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:5be6833735e290e26232abe2d65197942057fb5091f103c128ca454e2043c1d9
COPY --from=pulumi/pulumi-base:3.234.0@sha256:9be92c203cda6d9e10cc6d836c1220bebb0b9fe6a3c295a5239d66db9e4b37c7 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
