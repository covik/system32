FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:294bebcbbc229249a8eb0867cf305e82aee9c307e95d46b02518c3335a663b51
COPY --from=pulumi/pulumi-base:3.277.0@sha256:bd5c6a2d6c859492cdeedbed7690b3664fd3f8780392c88afad22ab420dc790c \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
