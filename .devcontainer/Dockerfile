FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:045e66010973363cc211c8d86133580eb6106713314797066efe60cba970b9a8
COPY --from=pulumi/pulumi-base:3.275.0@sha256:88c7061208bd21b25741e59c9d2478471656e19b1f0a022e0c6a6b3338520853 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
