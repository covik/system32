FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:a10d33dab2cceee38cae5c732dfd155a76d5cf915a3b22a269826697d52d0a44
COPY --from=pulumi/pulumi-base:3.261.0@sha256:f0eb5453643a615d262bf670e0b1168d939dd84bf541e9b4d98b79374fb0db68 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
