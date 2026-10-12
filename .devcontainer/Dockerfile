FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:782cb901987d8606987d5e3135dbec6fad70744b593fd29360e2b66ee278b060
COPY --from=pulumi/pulumi-base:3.268.0@sha256:4232eef43dca93e5ab4ed942b18d85a42140466681011ded7435d2b2bbf284d5 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
