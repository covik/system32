FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:294bebcbbc229249a8eb0867cf305e82aee9c307e95d46b02518c3335a663b51
COPY --from=pulumi/pulumi-base:3.278.0@sha256:984932d3da986a814aeaa8868730423d6ec4ca3709626cd8bbdd69262dfe5a8b \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
