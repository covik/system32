FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:e66ed141c99e4190bf9dbf56db59f46f98cf172a341dfdd601ae6a78b23abbb3
COPY --from=pulumi/pulumi-base:3.239.0@sha256:8744e73d0a67aa77c73ca488b2b45b34e14a6c558cb40b7f37e04ef109fd0e26 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
