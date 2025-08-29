import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

export interface DatabaseConnection {
  url: pulumi.Input<string>;
  user: pulumi.Input<string>;
  password: pulumi.Input<string>;
}

export interface TraccarServerArguments {
  databaseConnection: DatabaseConnection;
  emailPassword?: pulumi.Input<string>;
}

export class TraccarServer extends pulumi.ComponentResource {
  public namespace: k8s.core.v1.Namespace;
  public service: k8s.core.v1.Service;

  public constructor(
    name: string,
    args: TraccarServerArguments,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:app:Traccar', name, args, opts);

    const { databaseConnection, emailPassword = '' } = args;

    const namespace = new k8s.core.v1.Namespace(
      `${name}-ns`,
      {
        metadata: {
          name: 'traccar-system',
        },
      },
      {
        parent: this,
        deleteBeforeReplace: true,
      },
    );

    const configuration = new k8s.core.v1.ConfigMap(
      `${name}-configuration`,
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

  <entry key='geocoder.enable'>false</entry>

  <entry key='filter.enable'>true</entry>
  <entry key='filter.zero'>true</entry>

  <entry key='logger.console'>true</entry>
  <entry key='logger.rotate'>false</entry>
  
  <entry key='report.trip.minimalTripDistance'>300</entry>
  <entry key='report.ignoreOdometer'>true</entry>

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
<html lang="hr">
<body>
Kontakt je uključen na vozilu $device.name
</body>
</html>`,
        },
      },
      { parent: this },
    );

    const labels = { app: 'traccar' };
    const configurationVolumeName = 'configuration';

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
                  name: 'server',
                  image:
                    'traccar/traccar:6.6-alpine@sha256:dc73ac1ac1388f97e3259dbbea3bd09d90dccd2df391466ef51826ac591a33f9',
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
                      path: '/api/server',
                      port: 'api',
                      scheme: 'HTTP',
                    },
                    failureThreshold: 30,
                    periodSeconds: 30,
                  },
                  livenessProbe: {
                    httpGet: {
                      path: '/api/server',
                      port: 'api',
                    },
                    periodSeconds: 60,
                    failureThreshold: 2,
                  },
                  readinessProbe: {
                    httpGet: {
                      path: '/api/server?force=true',
                      port: 'api',
                    },
                    periodSeconds: 60,
                    failureThreshold: 1,
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
            {
              name: 'teltonika',
              port: 5027,
              targetPort:
                deployment.spec.template.spec.containers[0].ports[1].name,
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
