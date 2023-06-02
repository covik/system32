import * as command from '@pulumi/command';
import * as docker from '@pulumi/docker';
import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { createMysqlConnectionString } from '../utils';
import type { DatabaseConnectionSettings } from './backend';

export const commonFlags = {
  'zeroDateTimeBehavior': 'round',
  'serverTimezone': 'UTC',
  'allowPublicKeyRetrieval': 'true',
  'ssl-mode': 'REQUIRED',
  'allowMultiQueries': 'true',
  'autoReconnect': 'true',
  'useUnicode': 'yes',
  'characterEncoding': 'UTF-8',
};

export const productionFlags = {
  ...commonFlags,
  'sessionVariables=sql_require_primary_key': '1',
};

export const createConnectionString = createMysqlConnectionString;

export function kubernetes(
  image: pulumi.Input<string>,
  provider: k8s.Provider,
): DatabaseConnectionSettings {
  const namespace = new k8s.core.v1.Namespace(
    'mysql',
    {
      metadata: {
        name: 'mysql',
      },
    },
    { provider },
  ).metadata.name;

  const labels = { app: 'mysql' };
  const deployment = new k8s.apps.v1.Deployment(
    'mysql',
    {
      metadata: {
        namespace,
        name: 'mysql',
      },
      spec: {
        selector: {
          matchLabels: labels,
        },
        strategy: {
          type: 'Recreate',
        },
        template: {
          metadata: {
            labels,
          },
          spec: {
            restartPolicy: 'Always',
            containers: [
              {
                image,
                name: 'db-engine',
                ports: [
                  {
                    name: 'mysql',
                    containerPort: 3306,
                    protocol: 'TCP',
                  },
                ],
                env: [
                  {
                    name: 'MYSQL_ROOT_PASSWORD',
                    value: 'root',
                  },
                  {
                    name: 'MYSQL_USER',
                    value: 'developer',
                  },
                  {
                    name: 'MYSQL_PASSWORD',
                    value: 'developer',
                  },
                  {
                    name: 'MYSQL_DATABASE',
                    value: 'fms',
                  },
                ],
                volumeMounts: [
                  {
                    name: 'persistent-storage',
                    mountPath: '/var/lib/mysql',
                  },
                ],
              },
            ],
            volumes: [
              {
                name: 'persistent-storage',
                hostPath: {
                  path: '/monorepo/tmp/MySQL',
                  type: 'DirectoryOrCreate',
                },
              },
            ],
          },
        },
      },
    },
    { provider },
  );
  const service = new k8s.core.v1.Service(
    'mysql-tcp-service',
    {
      metadata: {
        namespace,
      },
      spec: {
        selector: labels,
        ports: [
          {
            port: 3306,
            targetPort:
              deployment.spec.template.spec.containers[0].ports[0].name,
            protocol: 'TCP',
          },
        ],
      },
    },
    { provider },
  );

  return {
    url: createConnectionString({
      host: pulumi.interpolate`${service.metadata.name}.${namespace}`,
      port: service.spec.ports[0].port,
      database: 'fms',
      flags: commonFlags,
    }),
    user: 'developer',
    password: 'developer',
  };
}

export function image(
  name: string,
  containerRegistry: pulumi.Resource,
  uid: number,
  gid: number,
): pulumi.Output<string> {
  const mysqlImage = new docker.Image('mysql', {
    build: {
      dockerfile: '/monorepo/mysql.Dockerfile',
      context: '/monorepo',
      args: {
        uid: String(uid),
        gid: String(gid),
      },
    },
    imageName: name,
    skipPush: true,
  });

  const clusterMysqlImage = new command.local.Command(
    'cluster-mysql-image',
    {
      create: mysqlImage.baseImageName.apply((name) => `docker push ${name}`),
    },
    { dependsOn: [containerRegistry, mysqlImage] },
  );

  return clusterMysqlImage.stdout.apply(
    () => docker.getRemoteImageOutput({ name }).repoDigest,
  );
}
