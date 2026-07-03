FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:e39c77a1d840eccb0d90257c20a436d4e90447b92dcfc0e637b15a6f25f90fd8
COPY --from=pulumi/pulumi-base:3.247.0@sha256:b6eb2365c99a71e7ce7084072710db4cd7690559cc60bec435b5fac32c70b81b \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
