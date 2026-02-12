import * as cloudflare from '@pulumi/cloudflare';
import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

export interface CromanjonacHomePageArgs {
  cpu: pulumi.Input<string>;
  memory: pulumi.Input<string>;
}

export class CromanjonacHomePage extends pulumi.ComponentResource {
  public namespaceName: pulumi.Output<string>;
  public serviceName: pulumi.Output<string>;
  public servicePort: pulumi.Output<number>;

  constructor(
    name: string,
    args: CromanjonacHomePageArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:app:CromanjonacHomepage', name, args, opts);
    const hostname = 'cromanjonac.dev';

    const dnsZone = cloudflare.Zone.get(
      hostname,
      '5be21630023716ba935edeb19f232538',
      {},
    );

    new cloudflare.DnsRecord('cname-to-zth.dev', {
      zoneId: dnsZone.id,
      name: hostname,
      type: 'CNAME',
      content: 'zth.dev',
      ttl: 1800,
    });

    const namespace = new k8s.core.v1.Namespace(
      `${name}-ns`,
      {
        metadata: { name: 'cromanjonac-homepage' },
      },
      { parent: this, deleteBeforeReplace: true },
    );

    const appLabels = { app: 'cromanjonac-homepage-server' };
    const image =
      'ghcr.io/covik/cromanjonac.dev@sha256:2d74d8689bf3838ea4e8c94939f40c3c5a5685b68651399d137d5a551e69bc66';
    const deployment = new k8s.apps.v1.Deployment(
      `${name}-deployment`,
      {
        metadata: { namespace: namespace.metadata.name },
        spec: {
          selector: { matchLabels: appLabels },
          replicas: 1,
          template: {
            metadata: { labels: appLabels },
            spec: {
              containers: [
                {
                  name: 'server',
                  image,
                  ports: [{ containerPort: 3000 }],
                  resources: {
                    requests: {
                      cpu: args.cpu,
                      memory: args.memory,
                    },
                    limits: {
                      memory: args.memory,
                    },
                  },
                },
              ],
            },
          },
        },
      },
      { parent: this },
    );

    const service = new k8s.core.v1.Service(
      `${name}-service`,
      {
        metadata: { namespace: namespace.metadata.name },
        spec: {
          selector: deployment.spec.template.metadata.labels,
          ports: [
            {
              port: 80,
              targetPort:
                deployment.spec.template.spec.containers[0].ports[0]
                  .containerPort,
            },
          ],
          type: 'ClusterIP',
        },
      },
      { parent: this },
    );

    this.namespaceName = namespace.metadata.name;
    this.serviceName = service.metadata.name;
    this.servicePort = service.spec.ports[0].port;

    this.registerOutputs({
      namespaceName: this.namespaceName,
      serviceName: this.serviceName,
      servicePort: this.servicePort,
    });
  }
}
