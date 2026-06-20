FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:37eb63d96c44badf9e9a68cf8ba2b4724c9682cda08cbd5fa50bf1955754497a
COPY --from=pulumi/pulumi-base:3.247.0@sha256:b6eb2365c99a71e7ce7084072710db4cd7690559cc60bec435b5fac32c70b81b \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
