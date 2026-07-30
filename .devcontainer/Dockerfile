FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:1f13af93fc9b845a4ee55c84d6e6c6ad2c6419b0fdeef4a6c13ad5a3f561d034
COPY --from=pulumi/pulumi-base:3.255.0@sha256:cddd1a22ed437212da30067f53d585531a7a5479b44195dcc9cf3f50ef020425 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
