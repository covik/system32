import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import type { DockerCredentials } from '../utils';

export interface TeltonikaServerArguments {
  containerRegistryCredentials: pulumi.Output<DockerCredentials>;
  image: pulumi.Input<string>;
  gatewayClassName: pulumi.Input<string>;
}

export class TeltonikaServer extends pulumi.ComponentResource {
  public port: pulumi.Output<number>;

  public constructor(
    name: string,
    args: TeltonikaServerArguments,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:backend:TeltonikaServer', name, args, opts);

    const { image, containerRegistryCredentials, gatewayClassName } = args;
    const namespaceName = 'teltonika-system';

    const namespace = new k8s.core.v1.Namespace(
      namespaceName,
      {
        metadata: {
          name: namespaceName,
        },
      },
      {
        parent: this,
        deleteBeforeReplace: true,
      },
    );

    const containerRegistry: k8s.core.v1.Secret = new k8s.core.v1.Secret(
      `container-registry-credentials`,
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
      { parent: this },
    );

    const labels = { app: 'teltonika' };
    const deployment = new k8s.apps.v1.Deployment(
      'teltonika-server',
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
              imagePullSecrets: [{ name: containerRegistry.metadata.name }],
              restartPolicy: 'Always',
              containers: [
                {
                  name: 'server',
                  image,
                  imagePullPolicy: 'IfNotPresent',
                  command: ['php'],
                  args: ['bin/teltonika.php'],
                  ports: [
                    {
                      name: 'teltonika',
                      containerPort: 8400,
                      protocol: 'TCP',
                    },
                  ],
                  resources: {
                    requests: {
                      memory: '32Mi',
                      cpu: '100m',
                    },
                    limits: {
                      memory: '64Mi',
                      cpu: '150m',
                    },
                  },
                },
              ],
            },
          },
        },
      },
      {
        parent: this,
      },
    );

    const service = new k8s.core.v1.Service(
      'teltonika-service',
      {
        metadata: {
          namespace: namespace.metadata.name,
        },
        spec: {
          selector: labels,
          ports: [
            {
              name: 'teltonika',
              port: 8400,
              targetPort:
                deployment.spec.template.spec.containers[0].ports[0].name,
              protocol: 'TCP',
            },
          ],
        },
      },
      {
        parent: this,
      },
    );

    const sectionName = 'teltonika-tcp';
    const gateway = new k8s.apiextensions.CustomResource(
      'teltonika-gateway',
      {
        apiVersion: 'gateway.networking.k8s.io/v1',
        kind: 'Gateway',
        metadata: {
          name: 'teltonika-gateway',
          namespace: namespace.metadata.name,
        },
        spec: {
          gatewayClassName,
          listeners: [
            {
              name: sectionName,
              protocol: 'TCP',
              port: service.spec.ports[0].port,
              allowedRoutes: {
                kinds: [{ kind: 'TCPRoute' }],
              },
            },
          ],
        },
      },
      { parent: this },
    );

    new k8s.apiextensions.CustomResource(
      'teltonika-route',
      {
        apiVersion: 'gateway.networking.k8s.io/v1alpha2',
        kind: 'TCPRoute',
        metadata: {
          name: 'teltonika-route',
          namespace: namespace.metadata.name,
        },
        spec: {
          parentRefs: [{ name: gateway.metadata.name, sectionName }],
          rules: [
            {
              backendRefs: [
                {
                  name: service.metadata.name,
                  port: service.spec.ports[0].port,
                },
              ],
            },
          ],
        },
      },
      { parent: this },
    );

    this.port = service.spec.ports[0].port;

    this.registerOutputs({
      port: this.port,
    });
  }
}
