FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:21f15d367bfc5ceadabb9989be48029cba1e6bd80da323405232614a267a9c45
COPY --from=pulumi/pulumi-base:3.226.0@sha256:c526e364744dd2339c67982c7aeb5f9b82292f6cd4e0f5e340af60b9997e2098 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
