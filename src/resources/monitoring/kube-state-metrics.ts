import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

export interface KubeStateMetricsArgs {}

export class KubeStateMetrics extends pulumi.ComponentResource {
  public serviceName: pulumi.Output<string>; // without .svc.cluster.local
  public servicePort: pulumi.Output<number>;

  constructor(
    name: string,
    args: KubeStateMetricsArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:monitoring:KubeStateMetrics', name, {}, opts);

    const release = new k8s.helm.v3.Release(
      name,
      {
        name,
        chart: 'kube-state-metrics',
        version: '5.25.1',
        namespace: 'kube-system',
        repositoryOpts: {
          repo: 'https://prometheus-community.github.io/helm-charts',
        },
        values: {},
      },
      { parent: this },
    );

    this.serviceName = pulumi.interpolate`${name}-${release.chart}.${release.namespace}`;
    this.servicePort = pulumi.output(8080);

    this.registerOutputs({
      serviceName: this.serviceName,
      servicePort: this.servicePort,
    });
  }
}
