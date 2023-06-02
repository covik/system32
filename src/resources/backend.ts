/* eslint-disable no-new */
import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import type { ComponentResourceOptions } from '@pulumi/pulumi/resource';

export interface DatabaseConnectionSettings {
  url: pulumi.Input<string>;
  user: pulumi.Input<string>;
  password: pulumi.Input<string>;
}

export interface ApplicationArguments {
  databaseConnection: DatabaseConnectionSettings;
  routes: string[];
  teltonikaNodePort: pulumi.Input<number>;
  emailPassword?: pulumi.Input<string>;
}

export class Application extends pulumi.ComponentResource {
  public constructor(
    name: string,
    args: ApplicationArguments,
    opts?: ComponentResourceOptions,
  ) {
    super('fms:backend:Application', name, args, opts);

    const {
      databaseConnection,
      routes,
      teltonikaNodePort,
      emailPassword = '',
    } = args;

    if (routes.length < 1)
      throw new Error('There should be at least one route (usually /api)');

    const namespace = new k8s.core.v1.Namespace(
      'backend',
      {
        metadata: {
          name: 'backend',
        },
      },
      {
        parent: this,
        deleteBeforeReplace: true,
      },
    );

    const configuration = new k8s.core.v1.ConfigMap(
      'traccar-configuration',
      {
        metadata: {
          namespace: namespace.metadata.name,
        },
        data: {
          'traccar.xml': pulumi.interpolate`<?xml version='1.0' encoding='UTF-8'?>

<!DOCTYPE properties SYSTEM 'http://java.sun.com/dtd/properties.dtd'>

<properties>

  <entry key='config.default'>./conf/default.xml</entry>

  <!--
  This is the main configuration file. All your configuration parameters should be placed in this file.
  Default configuration parameters are located in the "default.xml" file. You should not modify it to avoid issues
  with upgrading to a new version. Parameters in the main config file override values in the default file. Do not
  remove "config.default" parameter from this file unless you know what you are doing.
  For list of available parameters see following page: https://www.traccar.org/configuration-file/
  -->

  <entry key='database.driver'>com.mysql.cj.jdbc.Driver</entry>
  <entry key='database.url'>${databaseConnection.url}</entry>
  <entry key='database.user'>${databaseConnection.user}</entry>
  <entry key='database.password'>${databaseConnection.password}</entry>
  <entry key='database.saveOriginal'>false</entry>

  <entry key='web.origin'>*</entry>
  <entry key='web.persistSession'>true</entry>
  <entry key='web.path'>./legacy</entry>

  <entry key='geocoder.enable'>false</entry>

  <entry key='filter.enable'>true</entry>
  <entry key='filter.zero'>true</entry>

  <entry key='logger.console'>true</entry>
  <entry key='logger.level'>severe</entry>
  <entry key='logger.rotate'>false</entry>
  
  <entry key='report.trip.minimalTripDistance'>300</entry>

${
  emailPassword !== ''
    ? pulumi.interpolate`
  <entry key='mail.smtp.host'>smtp.zoho.eu</entry>
  <entry key='mail.smtp.port'>587</entry>
  <entry key='mail.smtp.starttls.enable'>true</entry>
  <entry key='mail.smtp.from'>notifications@zarafleet.com</entry>
  <entry key='mail.smtp.auth'>true</entry>
  <entry key='mail.smtp.username'>notifications@zarafleet.com</entry>
  <entry key='mail.smtp.password'>${emailPassword}</entry>`
    : ''
}

</properties>`,
          'ignitionOn.vm': `#set($subject = "$device.name: kontakt uključen")
<!DOCTYPE html>
<html>
<body>
Kontakt je uključen na vozilu $device.name
</body>
</html>`,
        },
      },
      { parent: namespace },
    );

    const labels = { app: 'traccar' };
    const configurationVolumeName = 'configuration';

    const deployment = new k8s.apps.v1.Deployment(
      'traccar',
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
              volumes: [
                {
                  name: configurationVolumeName,
                  configMap: {
                    name: configuration.metadata.name,
                  },
                },
              ],
              restartPolicy: 'Always',
              containers: [
                {
                  name: 'backend',
                  image: 'traccar/traccar:5.7-alpine',
                  imagePullPolicy: 'IfNotPresent',
                  ports: [
                    {
                      name: 'api',
                      containerPort: 8082,
                      protocol: 'TCP',
                    },
                    {
                      name: 'teltonika',
                      containerPort: 5027,
                      protocol: 'TCP',
                    },
                  ],
                  startupProbe: {
                    httpGet: {
                      path: '/',
                      port: 'api',
                      scheme: 'HTTP',
                    },
                    failureThreshold: 30,
                    periodSeconds: 30,
                  },
                  volumeMounts: [
                    {
                      name: configurationVolumeName,
                      mountPath: '/opt/traccar/conf/traccar.xml',
                      subPath: 'traccar.xml',
                      readOnly: true,
                    },
                    {
                      name: configurationVolumeName,
                      mountPath: '/opt/traccar/templates/full/ignitionOn.vm',
                      subPath: 'ignitionOn.vm',
                      readOnly: true,
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      { parent: namespace },
    );

    new k8s.core.v1.Service(
      'traccar-teltonika-service',
      {
        metadata: {
          namespace: namespace.metadata.name,
          annotations: {
            'kubernetes.digitalocean.com/firewall-managed': 'false',
          },
        },
        spec: {
          type: 'NodePort',
          selector: labels,
          ports: [
            {
              name: 'teltonika',
              port: 5027,
              nodePort: teltonikaNodePort,
              targetPort:
                deployment.spec.template.spec.containers[0].ports[1].name,
              protocol: 'TCP',
            },
          ],
        },
      },
      {
        parent: namespace,
        deleteBeforeReplace: true, // otherwise nodePort is already allocated and cannot be used
      },
    );

    const service = new k8s.core.v1.Service(
      'traccar-http-service',
      {
        metadata: {
          namespace: namespace.metadata.name,
        },
        spec: {
          selector: labels,
          ports: [
            {
              name: 'api',
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

    new k8s.networking.v1.Ingress(
      'traccar-ingress',
      {
        metadata: {
          namespace: namespace.metadata.name,
          annotations: {
            'pulumi.com/skipAwait': 'true',
          },
        },
        spec: {
          rules: routes.map((route) => {
            const host = route.substring(0, route.indexOf('/'));
            const path = route.substring(route.indexOf('/'));
            const hostIfNeeded = host !== '' ? { host } : {};

            return {
              ...hostIfNeeded,
              http: {
                paths: [
                  {
                    path,
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
            };
          }),
        },
      },
      { parent: namespace },
    );

    this.registerOutputs();
  }
}
