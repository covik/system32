/* eslint-disable no-new */
import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import type { DockerCredentials } from '../utils';
import type { ComponentResourceOptions } from '@pulumi/pulumi/resource';

export interface ApplicationArguments {
  image: pulumi.Input<string>;
  containerRegistryCredentials: pulumi.Output<DockerCredentials>;
  hostname: undefined | pulumi.Input<string>;
}

export class Application extends pulumi.ComponentResource {
  public constructor(
    name: string,
    args: ApplicationArguments,
    opts?: ComponentResourceOptions,
  ) {
    super('fms:frontend:Application', name, args, opts);

    const { image, containerRegistryCredentials, hostname } = args;

    const namespace = new k8s.core.v1.Namespace(
      'frontend',
      {
        metadata: {
          name: 'frontend',
        },
      },
      {
        parent: this,
        deleteBeforeReplace: true,
      },
    );

    const containerRegistry: k8s.core.v1.Secret = new k8s.core.v1.Secret(
      'container-registry-credentials',
      {
        metadata: {
          name: 'container-registry',
          namespace: namespace.metadata.name,
        },
        type: 'kubernetes.io/dockerconfigjson',
        data: {
          '.dockerconfigjson': containerRegistryCredentials.apply(
            (credentials) =>
              Buffer.from(credentials.toJSON()).toString('base64'),
          ),
        },
      },
      { parent: namespace },
    );

    const labels = { app: 'frontend' };

    const imagePullSecrets =
      containerRegistry !== undefined
        ? [{ name: containerRegistry.metadata.name }]
        : [];

    const containerPort = 80;

    const deployment = new k8s.apps.v1.Deployment(
      'frontend-application',
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
              imagePullSecrets,
              restartPolicy: 'Always',
              volumes: [],
              containers: [
                {
                  name: 'webserver',
                  image,
                  imagePullPolicy: 'IfNotPresent',
                  ports: [
                    {
                      name: 'http',
                      containerPort,
                      protocol: 'TCP',
                    },
                  ],
                  volumeMounts: [],
                },
              ],
            },
          },
        },
      },
      { parent: namespace },
    );

    const service = new k8s.core.v1.Service(
      'frontend-http-service',
      {
        metadata: {
          namespace: namespace.metadata.name,
        },
        spec: {
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
      { parent: namespace },
    );

    const limitToHostIfNeeded =
      hostname !== undefined ? { host: hostname } : {};

    new k8s.networking.v1.Ingress(
      'frontend-ingress',
      {
        metadata: {
          namespace: namespace.metadata.name,
          annotations: {
            'pulumi.com/skipAwait': 'true',
          },
        },
        spec: {
          rules: [
            {
              ...limitToHostIfNeeded,
              http: {
                paths: [
                  {
                    path: '/',
                    pathType: 'Prefix',
                    backend: {
                      service: {
                        name: service.metadata.name,
                        port: {
                          name: service.spec.ports[0].name,
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      { parent: namespace },
    );

    this.registerOutputs();
  }
}
