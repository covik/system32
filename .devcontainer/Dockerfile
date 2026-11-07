FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:045e66010973363cc211c8d86133580eb6106713314797066efe60cba970b9a8
COPY --from=pulumi/pulumi-base:3.274.1@sha256:9b6fcd6b4f021c7cc2f9e63c3bae80d54d53a7b3390b9769cd37489afbe727af \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
