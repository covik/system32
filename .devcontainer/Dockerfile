FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:a10d33dab2cceee38cae5c732dfd155a76d5cf915a3b22a269826697d52d0a44
COPY --from=pulumi/pulumi-base:3.265.0@sha256:bc6aa0906558f5bc18dbb5a5385549291f477d5f29af7e7fbf30f84274176dbc \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
