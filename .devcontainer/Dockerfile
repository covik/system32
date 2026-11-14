FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:79dc0a2abec8743065a7b43774f9301f18c1a6f69702acd0010b9b06d9789041
COPY --from=pulumi/pulumi-base:3.275.0@sha256:88c7061208bd21b25741e59c9d2478471656e19b1f0a022e0c6a6b3338520853 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
