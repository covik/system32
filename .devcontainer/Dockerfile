FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:5be6833735e290e26232abe2d65197942057fb5091f103c128ca454e2043c1d9
COPY --from=pulumi/pulumi-base:3.245.0@sha256:c76f0c6fce1e78842ab99c0c048a8a51c3c3ebcf672895a7187ee2c94fa430aa \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
