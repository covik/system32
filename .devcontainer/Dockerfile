FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:782cb901987d8606987d5e3135dbec6fad70744b593fd29360e2b66ee278b060
COPY --from=pulumi/pulumi-base:3.269.0@sha256:0c9f2285f9a4710e9a9f8543df14f389fe205e48f31ecb5ba861353df8c774cb \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
