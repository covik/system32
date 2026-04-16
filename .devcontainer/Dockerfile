FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:21f15d367bfc5ceadabb9989be48029cba1e6bd80da323405232614a267a9c45
COPY --from=pulumi/pulumi-base:3.231.0@sha256:61c6507f5783491e50f2c37767251454cb463c6b646da5ec239d98d39c79fe64 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
