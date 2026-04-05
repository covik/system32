FROM mcr.microsoft.com/devcontainers/javascript-node:24@sha256:21f15d367bfc5ceadabb9989be48029cba1e6bd80da323405232614a267a9c45
COPY --from=pulumi/pulumi-base:3.229.0@sha256:8223a72a5a4b226fb359b26202d06bb8994387b72832782b9d4e49aef6892875 \
    /pulumi/bin/pulumi \
    /pulumi/bin/pulumi-language-nodejs \
    /usr/local/bin/
