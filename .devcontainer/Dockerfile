FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:21f15d367bfc5ceadabb9989be48029cba1e6bd80da323405232614a267a9c45
COPY --from=pulumi/pulumi-base:3.230.0@sha256:b1142de9aae155695a6665ffefd4131e61d60cb6db533c6e576a360f2c25082d \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
