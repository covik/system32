set -x
pulumi stack select --create local
pulumi up --yes --skip-preview
