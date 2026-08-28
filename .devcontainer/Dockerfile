FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:5e292d58f9996e2e625f119d69ea774a57b1e47cc853bf7b5f1986e1834bda4c
COPY --from=pulumi/pulumi-base:3.260.0@sha256:0e58ea65f459e358765934bc8d50ffd6729dec830da709bd9b966087cb9c0066 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
