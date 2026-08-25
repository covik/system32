FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:146b2130860668b099a28babb1b7ea3ff0570a9e1eaaa1d801bad5ff07c850e9
COPY --from=pulumi/pulumi-base:3.259.0@sha256:424f313f8b9781e7d4893dccaf8cca21b520f45691605cd56e6d93f1b38978e1 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
