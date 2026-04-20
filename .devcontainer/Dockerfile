FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:e66ed141c99e4190bf9dbf56db59f46f98cf172a341dfdd601ae6a78b23abbb3
COPY --from=pulumi/pulumi-base:3.231.0@sha256:61c6507f5783491e50f2c37767251454cb463c6b646da5ec239d98d39c79fe64 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
