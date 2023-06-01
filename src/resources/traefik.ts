import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

export interface TraefikArguments {
  nodePort: pulumi.Input<number>;
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

    new k8s.helm.v3.Chart(
      'ingress-controller',
      {
        chart: 'traefik',
        version: '23.0.1',
        namespace: namespace.metadata.name,
        fetchOpts: {
          repo: 'https://helm.traefik.io/traefik',
        },
        values: {
          service: {
            type: 'NodePort',
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
        transformations: [
          (obj: TraefikResource) => {
            if (obj.kind === 'Service') {
              obj.metadata.annotations = {
                'kubernetes.digitalocean.com/firewall-managed': 'false',
              };
            }
          },
        ],
      },
      { parent: namespace },
    );

    this.registerOutputs();
  }
}

interface TraefikResource {
  kind: string;
  metadata: {
    namespace: pulumi.Input<string>;
    annotations: Record<string, unknown>;
  };
}
