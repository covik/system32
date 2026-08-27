FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:5e292d58f9996e2e625f119d69ea774a57b1e47cc853bf7b5f1986e1834bda4c
COPY --from=pulumi/pulumi-base:3.259.0@sha256:424f313f8b9781e7d4893dccaf8cca21b520f45691605cd56e6d93f1b38978e1 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
