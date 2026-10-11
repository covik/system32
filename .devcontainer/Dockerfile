FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:3994cf8bdcb731b3910e6ef207c6759b026b2033c651105eba3110eab3560d2a
COPY --from=pulumi/pulumi-base:3.268.0@sha256:4232eef43dca93e5ab4ed942b18d85a42140466681011ded7435d2b2bbf284d5 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
