FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:a10d33dab2cceee38cae5c732dfd155a76d5cf915a3b22a269826697d52d0a44
COPY --from=pulumi/pulumi-base:3.262.0@sha256:0041a32afa8c8753b0934618598e6e4b60782162d6da40bb491b6522f68258c7 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
