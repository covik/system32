FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:21f15d367bfc5ceadabb9989be48029cba1e6bd80da323405232614a267a9c45
COPY --from=pulumi/pulumi-base:3.228.0@sha256:d6f7899c350cb4e7b96dc537d4fd3d55c1cffa9df24f106048a62671f22fa0ff \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
