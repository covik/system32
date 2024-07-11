import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

export interface TraefikArguments {
  nodePort: pulumi.Input<number>;
  annotations?: pulumi.Input<Record<string, string>>;
}

export class IngressController extends pulumi.ComponentResource {
  public constructor(
    name: string,
    args: TraefikArguments,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:traefik:IngressController', name, args, opts);

    const namespace = new k8s.core.v1.Namespace(
      'traefik-namespace',
      {
        metadata: { name: 'traefik' },
      },
      {
        parent: this,
        deleteBeforeReplace: true,
      },
    );

    new k8s.helm.v3.Release(
      'traefik-helm-chart',
      {
        chart: 'traefik',
        version: '23.2.0',
        namespace: namespace.metadata.name,
        repositoryOpts: {
          repo: 'https://traefik.github.io/charts',
        },
        values: {
          service: {
            type: 'NodePort',
            annotations: args.annotations || {},
          },
          ports: {
            web: {
              nodePort: args.nodePort,
            },
            websecure: {
              expose: false,
            },
          },
          ingressRoute: {
            dashboard: {
              enabled: false,
            },
          },
        },
      },
      { parent: this },
    );

    this.registerOutputs();
  }
}
