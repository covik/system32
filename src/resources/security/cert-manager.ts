import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { findHelmDependency } from '../../utils/index.js';

interface CertManagerArgs {}

export class CertManager extends pulumi.ComponentResource {
  public namespaceName: pulumi.Output<string>;

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

    const chartSettings = findHelmDependency('cert-manager');
    new k8s.helm.v3.Release(
      `${name}-release`,
      {
        name,
        chart: chartSettings.name,
        version: chartSettings.version,
        repositoryOpts: {
          repo: chartSettings.repository,
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

    this.namespaceName = namespace.metadata.name;

    this.registerOutputs({
      namespaceName: this.namespaceName,
    });
  }
}
