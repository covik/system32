import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

export function RegistrySecret(
  name: string,
  args: { namespace: k8s.core.v1.Namespace },
  resourceOptions: pulumi.ResourceOptions,
): pulumi.Output<k8s.core.v1.Secret> {
  const registryConfig = new pulumi.Config();

  return pulumi
    .all([
      registryConfig.require('container-registry-url'),
      registryConfig.require('container-registry-user'),
      registryConfig.requireSecret('container-registry-token'),
    ])
    .apply(
      ([url, username, password]) =>
        new k8s.core.v1.Secret(
          name,
          {
            metadata: {
              namespace: args.namespace.metadata.name,
            },
            type: 'kubernetes.io/dockerconfigjson',
            data: {
              '.dockerconfigjson': Buffer.from(
                JSON.stringify({
                  auths: {
                    [url]: {
                      auth: Buffer.from(
                        `${username}:${password}`,
                        'utf-8',
                      ).toString('base64'),
                    },
                  },
                }),
              ).toString('base64'),
            },
          },
          resourceOptions,
        ),
    );
}

export function resolveRegistryImage(
  tag: pulumi.Input<string>,
): pulumi.Output<string> {
  const registryConfig = new pulumi.Config();
  const url = registryConfig.require('container-registry-url');
  const user = registryConfig.require('container-registry-user');

  return pulumi.interpolate`${url}/${user}/${tag}`;
}
