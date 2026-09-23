FROM mcr.microsoft.com/devcontainers/javascript-node:26@sha256:a10d33dab2cceee38cae5c732dfd155a76d5cf915a3b22a269826697d52d0a44
COPY --from=pulumi/pulumi-base:3.264.0@sha256:a8fa210fc1a2850cb654db2fe76db95863073084edd9db4772a09f8f76da7fa4 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
