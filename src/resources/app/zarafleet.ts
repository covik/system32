import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as security from '../security/index.js';

export interface ZaraFleetArguments {
  image: pulumi.Input<string>;
}

export class ZaraFleet extends pulumi.ComponentResource {
  public namespace: k8s.core.v1.Namespace;
  public service: k8s.core.v1.Service;

  public constructor(
    name: string,
    args: ZaraFleetArguments,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:app:ZaraFleet', name, args, opts);

    const namespace = new k8s.core.v1.Namespace(
      `${name}-ns`,
      {
        metadata: {
          name: 'zarafleet-system',
        },
      },
      {
        parent: this,
        deleteBeforeReplace: true,
      },
    );

    const imageSecret = security.RegistrySecret(
      `${name}-cr`,
      { namespace },
      { parent: this },
    );

    const labels = { app: 'frontend' };
    const deployment = new k8s.apps.v1.Deployment(
      `${name}-app`,
      {
        metadata: {
          namespace: namespace.metadata.name,
        },
        spec: {
          selector: {
            matchLabels: labels,
          },
          replicas: 1,
          template: {
            metadata: {
              labels,
            },
            spec: {
              imagePullSecrets: [{ name: imageSecret.metadata.name }],
              restartPolicy: 'Always',
              containers: [
                {
                  name: 'webserver',
                  image: args.image,
                  imagePullPolicy: 'IfNotPresent',
                  ports: [
                    {
                      name: 'http',
                      containerPort: 80,
                      protocol: 'TCP',
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
      `${name}-svc`,
      {
        metadata: {
          namespace: namespace.metadata.name,
        },
        spec: {
          type: 'ClusterIP',
          selector: labels,
          ports: [
            {
              name: 'http',
              port: 80,
              targetPort:
                deployment.spec.template.spec.containers[0].ports[0].name,
              protocol: 'TCP',
            },
          ],
        },
      },
      { parent: this },
    );

    this.namespace = namespace;
    this.service = service;
    this.registerOutputs({
      namespace,
      service,
    });
  }
}
