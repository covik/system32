FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:5be6833735e290e26232abe2d65197942057fb5091f103c128ca454e2043c1d9
COPY --from=pulumi/pulumi-base:3.247.0@sha256:b6eb2365c99a71e7ce7084072710db4cd7690559cc60bec435b5fac32c70b81b \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
