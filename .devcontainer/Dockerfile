FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:095b1322d0ba8802df42821d36d221d2ecc7323874acb75f3c49c8adc403d44e
COPY --from=pulumi/pulumi-base:3.259.0@sha256:424f313f8b9781e7d4893dccaf8cca21b520f45691605cd56e6d93f1b38978e1 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
