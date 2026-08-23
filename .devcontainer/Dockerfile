FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:1f13af93fc9b845a4ee55c84d6e6c6ad2c6419b0fdeef4a6c13ad5a3f561d034
COPY --from=pulumi/pulumi-base:3.259.0@sha256:424f313f8b9781e7d4893dccaf8cca21b520f45691605cd56e6d93f1b38978e1 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
