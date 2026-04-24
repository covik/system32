FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:e66ed141c99e4190bf9dbf56db59f46f98cf172a341dfdd601ae6a78b23abbb3
COPY --from=pulumi/pulumi-base:3.232.0@sha256:6afadb67df48f2d01348991f5b9a3466f118c30d9e0dfbb16fac5c0e958f4805 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
