import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

export interface OpenTelemetryOperatorArgs {}

export class OpenTelemetryOperator extends pulumi.ComponentResource {
  constructor(
    name: string,
    args: OpenTelemetryOperatorArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:monitoring:OpenTelemetryOperator', name, args, opts);

    const namespace = new k8s.core.v1.Namespace(
      `${name}-ns`,
      {
        metadata: { name: 'opentelemetry-operator-system' },
      },
      { parent: this, deleteBeforeReplace: true },
    );

    new k8s.helm.v3.Release(
      `${name}-release`,
      {
        name,
        chart: 'opentelemetry-operator',
        version: '0.64.4',
        repositoryOpts: {
          repo: 'https://open-telemetry.github.io/opentelemetry-helm-charts',
        },
        namespace: namespace.metadata.name,
        // atomic: true,
        values: {
          manager: {
            collectorImage: {
              repository: 'otel/opentelemetry-collector-contrib',
              tag: '0.106.0',
            },
          },
        },
      },
      { parent: this, dependsOn: [namespace] },
    );
  }
}
