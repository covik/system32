FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:5e292d58f9996e2e625f119d69ea774a57b1e47cc853bf7b5f1986e1834bda4c
COPY --from=pulumi/pulumi-base:3.261.0@sha256:f0eb5453643a615d262bf670e0b1168d939dd84bf541e9b4d98b79374fb0db68 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
