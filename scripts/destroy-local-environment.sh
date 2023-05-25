set -x
pulumi destroy --stack local && pulumi stack rm local --yes
