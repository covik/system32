FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:782cb901987d8606987d5e3135dbec6fad70744b593fd29360e2b66ee278b060
COPY --from=pulumi/pulumi-base:3.270.0@sha256:5b46cc65533ad64feacc971b0399231792111af54045e45fbe635105ff270ba6 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
