FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:782cb901987d8606987d5e3135dbec6fad70744b593fd29360e2b66ee278b060
COPY --from=pulumi/pulumi-base:3.267.0@sha256:78a0f1547f834efe340d2debac8f701e4c828a2c93355197142f04a48d5403bd \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
