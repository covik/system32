FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:045e66010973363cc211c8d86133580eb6106713314797066efe60cba970b9a8
COPY --from=pulumi/pulumi-base:3.272.0@sha256:ebdf7aeb334afce0ea19bea3d35edff704d9345c7ab78fc9a5601da9dcfff599 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
