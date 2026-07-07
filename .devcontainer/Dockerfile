FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:e39c77a1d840eccb0d90257c20a436d4e90447b92dcfc0e637b15a6f25f90fd8
COPY --from=pulumi/pulumi-base:3.250.0@sha256:156226cc55b8e38907eaf51f2de159902675d60ebdf9db18fe8abb386805bb3c \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
