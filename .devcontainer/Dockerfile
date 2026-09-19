FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:a10d33dab2cceee38cae5c732dfd155a76d5cf915a3b22a269826697d52d0a44
COPY --from=pulumi/pulumi-base:3.263.0@sha256:356d7a933f41ad24143816ab0b39a5aad754a38dce3ad9c64d8283d125bbfe71 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
