import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

interface CertManagerArgs {}

export class CertManager extends pulumi.ComponentResource {
  constructor(
    name: string,
    args: CertManagerArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:security:CertManager', name, args, opts);

    const namespace = new k8s.core.v1.Namespace(
      `${name}-ns`,
      {
        metadata: {
          name: 'cert-manager',
        },
      },
      { parent: this, deleteBeforeReplace: true },
    );

    new k8s.helm.v3.Release(
      `${name}-release`,
      {
        name,
        chart: 'cert-manager',
        version: 'v1.15.1',
        repositoryOpts: {
          repo: 'https://charts.jetstack.io',
        },
        namespace: namespace.metadata.name,
        values: {
          crds: {
            enabled: true,
          },
          extraArgs: ['--enable-gateway-api'],
        },
      },
      { parent: this },
    );

    this.registerOutputs({});
  }
}
