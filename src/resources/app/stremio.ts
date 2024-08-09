import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

export interface StremioServerArgs {}

export class StremioServer extends pulumi.ComponentResource {
  public namespaceName: pulumi.Output<string>;
  public serviceName: pulumi.Output<string>;
  public servicePort: pulumi.Output<number>;

  constructor(
    name: string,
    args: StremioServerArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:app:StremioServer', name, {}, opts);

    const namespace = new k8s.core.v1.Namespace(
      `${name}-ns`,
      {
        metadata: { name: 'stremio-system' },
      },
      { parent: this, deleteBeforeReplace: true },
    );

    const appLabels = { app: 'stremio-server' };
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
                  image:
                    'stremio/server@sha256:68bf24548327897f9b63f24ccd9a653dfe9d5428f62aaedbc9ca43c0b253728f',
                  ports: [{ containerPort: 11470 }],
                  env: [
                    {
                      name: 'NO_CORS',
                      value: '1',
                    },
                  ],
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
