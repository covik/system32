import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as security from '../security';

export interface ZaraGPSArguments {
  image: pulumi.Input<string>;
  hostname: pulumi.Input<string>;
  db: {
    host: pulumi.Input<string>;
    port: pulumi.Input<number>;
    database: pulumi.Input<string>;
    user: pulumi.Input<string>;
    password: pulumi.Input<string>;
  };
}

export class ZaraGPS extends pulumi.ComponentResource {
  public namespace: k8s.core.v1.Namespace;
  public service: k8s.core.v1.Service;

  public constructor(
    name: string,
    args: ZaraGPSArguments,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:app:ZaraGPS', name, args, opts);

    const config = new pulumi.Config();
    const appKey = config.requireSecret('zaragps-app-key');
    const googleMapsKey = config.requireSecret('zaragps-google-maps-key');

    const namespace = new k8s.core.v1.Namespace(
      `${name}-ns`,
      {
        metadata: {
          name: 'zaragps-system',
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

    const sensitiveData = new k8s.core.v1.Secret(
      `${name}-sensitive`,
      {
        metadata: {
          namespace: namespace.metadata.name,
        },
        stringData: {
          'app-key': appKey,
          'db-host': args.db.host,
          'db-port': pulumi.interpolate`${args.db.port}`,
          'db-database': args.db.database,
          'db-user': args.db.user,
          'db-password': args.db.password,
          'google-maps-key': googleMapsKey,
        },
      },
      {
        parent: this,
      },
    );

    const labels = { app: 'full-stack' };
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
                  env: [
                    {
                      name: 'APP_ENV',
                      value: 'production',
                    },
                    {
                      name: 'APP_DEBUG',
                      value: 'false',
                    },
                    {
                      name: 'APP_URL',
                      value: pulumi.interpolate`https://${args.hostname}`,
                    },
                    {
                      name: 'APP_KEY',
                      valueFrom: {
                        secretKeyRef: {
                          name: sensitiveData.metadata.name,
                          key: 'app-key',
                        },
                      },
                    },
                    {
                      name: 'DB_CONNECTION',
                      value: 'mysql',
                    },
                    {
                      name: 'DB_HOST',
                      valueFrom: {
                        secretKeyRef: {
                          name: sensitiveData.metadata.name,
                          key: 'db-host',
                        },
                      },
                    },
                    {
                      name: 'DB_PORT',
                      valueFrom: {
                        secretKeyRef: {
                          name: sensitiveData.metadata.name,
                          key: 'db-port',
                        },
                      },
                    },
                    {
                      name: 'DB_DATABASE',
                      valueFrom: {
                        secretKeyRef: {
                          name: sensitiveData.metadata.name,
                          key: 'db-database',
                        },
                      },
                    },
                    {
                      name: 'DB_USERNAME',
                      valueFrom: {
                        secretKeyRef: {
                          name: sensitiveData.metadata.name,
                          key: 'db-user',
                        },
                      },
                    },
                    {
                      name: 'DB_PASSWORD',
                      valueFrom: {
                        secretKeyRef: {
                          name: sensitiveData.metadata.name,
                          key: 'db-password',
                        },
                      },
                    },
                    {
                      name: 'SESSION_COOKIE_DOMAIN',
                      value: args.hostname,
                    },
                    {
                      name: 'SESSION_COOKIE_SECURE',
                      value: 'true',
                    },
                    {
                      name: 'GOOGLE_MAPS_KEY',
                      valueFrom: {
                        secretKeyRef: {
                          name: sensitiveData.metadata.name,
                          key: 'google-maps-key',
                        },
                      },
                    },
                  ],
                },
              ],
              initContainers: [
                {
                  name: 'database-migration',
                  image: args.image,
                  command: ['php'],
                  args: ['artisan', 'migrate', '--force'],
                  env: [
                    {
                      name: 'APP_KEY',
                      valueFrom: {
                        secretKeyRef: {
                          name: sensitiveData.metadata.name,
                          key: 'app-key',
                        },
                      },
                    },
                    {
                      name: 'DB_CONNECTION',
                      value: 'mysql',
                    },
                    {
                      name: 'DB_HOST',
                      valueFrom: {
                        secretKeyRef: {
                          name: sensitiveData.metadata.name,
                          key: 'db-host',
                        },
                      },
                    },
                    {
                      name: 'DB_PORT',
                      valueFrom: {
                        secretKeyRef: {
                          name: sensitiveData.metadata.name,
                          key: 'db-port',
                        },
                      },
                    },
                    {
                      name: 'DB_DATABASE',
                      valueFrom: {
                        secretKeyRef: {
                          name: sensitiveData.metadata.name,
                          key: 'db-database',
                        },
                      },
                    },
                    {
                      name: 'DB_USERNAME',
                      valueFrom: {
                        secretKeyRef: {
                          name: sensitiveData.metadata.name,
                          key: 'db-user',
                        },
                      },
                    },
                    {
                      name: 'DB_PASSWORD',
                      valueFrom: {
                        secretKeyRef: {
                          name: sensitiveData.metadata.name,
                          key: 'db-password',
                        },
                      },
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
