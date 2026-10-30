FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:045e66010973363cc211c8d86133580eb6106713314797066efe60cba970b9a8
COPY --from=pulumi/pulumi-base:3.273.0@sha256:40cf9b824f64b38d3906bd3f856214697f6881c0fbefbcaee13b2e298122b515 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
