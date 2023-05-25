/* eslint-disable no-new */
import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { DockerCredentials } from '../utils';
import type { ComponentResourceOptions } from '@pulumi/pulumi/resource';

export interface ApplicationArguments {
  image: pulumi.Input<string>;
  hotReload: false | { hostPath: pulumi.Input<string> };
  containerRegistryCredentials?: DockerCredentials;
  hostname: undefined | pulumi.Input<string>;
}

export class Application extends pulumi.ComponentResource {
  public constructor(
    name: string,
    args: ApplicationArguments,
    opts?: ComponentResourceOptions,
  ) {
    super('fms:frontend:Application', name, args, opts);

    const { image, hotReload, containerRegistryCredentials, hostname } = args;

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

    const containerRegistry: k8s.core.v1.Secret | undefined =
      containerRegistryCredentials instanceof DockerCredentials
        ? new k8s.core.v1.Secret(
            'container-registry-credentials',
            {
              metadata: {
                name: 'container-registry',
                namespace: namespace.metadata.name,
              },
              type: 'kubernetes.io/dockerconfigjson',
              data: {
                '.dockerconfigjson': Buffer.from(
                  containerRegistryCredentials.toJSON(),
                ).toString('base64'),
              },
            },
            { parent: namespace },
          )
        : undefined;

    const labels = { app: 'frontend' };

    const imagePullSecrets =
      containerRegistry !== undefined
        ? [{ name: containerRegistry.metadata.name }]
        : [];

    const commandOverrideIfHotReload =
      hotReload !== false ? { command: 'yarn dev:frontend'.split(' ') } : {};

    const containerPort = hotReload !== false ? 8080 : 80;

    const volumeMounts =
      hotReload === false
        ? []
        : [
            {
              name: 'hot-reload',
              mountPath: '/monorepo',
            },
          ];
    const volumes =
      hotReload === false
        ? []
        : [
            {
              name: 'hot-reload',
              hostPath: {
                path: hotReload.hostPath,
                type: 'Directory',
              },
            },
          ];

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
              volumes,
              containers: [
                {
                  name: 'webserver',
                  ...commandOverrideIfHotReload,
                  image,
                  imagePullPolicy: 'IfNotPresent',
                  ports: [
                    {
                      name: 'http',
                      containerPort,
                      protocol: 'TCP',
                    },
                  ],
                  volumeMounts,
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
