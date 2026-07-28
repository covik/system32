FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:e39c77a1d840eccb0d90257c20a436d4e90447b92dcfc0e637b15a6f25f90fd8
COPY --from=pulumi/pulumi-base:3.255.0@sha256:cddd1a22ed437212da30067f53d585531a7a5479b44195dcc9cf3f50ef020425 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
