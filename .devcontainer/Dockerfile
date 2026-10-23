FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:782cb901987d8606987d5e3135dbec6fad70744b593fd29360e2b66ee278b060
COPY --from=pulumi/pulumi-base:3.272.0@sha256:ebdf7aeb334afce0ea19bea3d35edff704d9345c7ab78fc9a5601da9dcfff599 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
