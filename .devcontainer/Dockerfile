FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:79dc0a2abec8743065a7b43774f9301f18c1a6f69702acd0010b9b06d9789041
COPY --from=pulumi/pulumi-base:3.277.0@sha256:bd5c6a2d6c859492cdeedbed7690b3664fd3f8780392c88afad22ab420dc790c \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
