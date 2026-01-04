import { writeFile } from 'node:fs/promises';
import * as cloudflare from '@pulumi/cloudflare';
import * as digitalocean from '@pulumi/digitalocean';
import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as app from '../resources/app/index.js';
import * as cluster from '../resources/cluster/index.js';
import * as gateway from '../resources/gateway/index.js';
import * as monitoring from '../resources/monitoring/index.js';
import * as security from '../resources/security/index.js';
import { createMysqlConnectionString } from '../utils/index.js';

const domain = 'zth.dev';
const zarafleetDomain = 'zarafleet.com';
const fmsUrl = `old.${zarafleetDomain}`;
const zarafleetUrl = `app.${zarafleetDomain}`;
const snapshooterIps = [
  '174.138.101.117',
  '209.38.181.248',
  '209.38.181.204',
] as const;
const fmsMysqlFlags = {
  'zeroDateTimeBehavior': 'round',
  'serverTimezone': 'UTC',
  'allowPublicKeyRetrieval': 'true',
  'ssl-mode': 'REQUIRED',
  'allowMultiQueries': 'true',
  'autoReconnect': 'true',
  'useUnicode': 'yes',
  'characterEncoding': 'UTF-8',
  'sessionVariables=sql_require_primary_key': '1',
};

export function resources(): unknown {
  const config = new pulumi.Config();
  const cloudflareConfig = new pulumi.Config('cloudflare');
  const region = config.require('region');

  const vpc = new digitalocean.Vpc('network', {
    name: 'cromanjonac-hq',
    region,
  });

  const kubernetes = new cluster.DigitalOceanCluster('kubernetes', {
    name: 'cromanjonac',
    version: '1.33.1-do.3',
    vmSize: 's-4vcpu-8gb',
    nodePoolName: 'engine',
    nodePoolTags: [],
    vpc,
    region,
  });

  const fmsDatabaseCluster = new digitalocean.DatabaseCluster(
    'fms-db-cluster',
    {
      name: 'fms-mysql',
      engine: 'mysql',
      version: '8',
      size: digitalocean.DatabaseSlug.DB_1VPCU1GB,
      nodeCount: 1,
      region,
      privateNetworkUuid: vpc.id,
      maintenanceWindows: [
        {
          day: 'sunday',
          hour: '03:00:00',
        },
      ],
    },
    { protect: true },
  );

  const fmsDatabaseUser = new digitalocean.DatabaseUser('fms-db-app-user', {
    name: 'backend',
    clusterId: fmsDatabaseCluster.id,
  });

  const fmsDatabase = new digitalocean.DatabaseDb(
    'fms-db',
    {
      name: 'fleet-management',
      clusterId: fmsDatabaseCluster.id,
    },
    {
      protect: true,
    },
  );

  new digitalocean.DatabaseUser(
    'fms-db-backup-user',
    {
      name: 'snapshooter',
      clusterId: fmsDatabaseCluster.id,
    },
    {
      protect: true,
    },
  );

  new digitalocean.DatabaseFirewall('fms-db-access-control', {
    rules: [
      { type: 'k8s', value: kubernetes.cluster.id },
      ...snapshooterIps.map((ip) => ({
        type: 'ip_addr',
        value: ip,
      })),
    ],
    clusterId: fmsDatabaseCluster.id,
  });

  const fmsDbConnection = {
    url: createMysqlConnectionString({
      host: fmsDatabaseCluster.privateHost,
      port: fmsDatabaseCluster.port,
      database: fmsDatabase.name,
      flags: fmsMysqlFlags,
    }),
    user: fmsDatabaseUser.name,
    password: fmsDatabaseUser.password,
  } satisfies app.DatabaseConnection;

  const backupStorage = new digitalocean.SpacesBucket(
    'fms-backup',
    {
      name: 'fms-backup',
      acl: 'private',
      region,
    },
    { protect: true },
  );

  new digitalocean.Project('project', {
    name: 'Cromanjonac',
    environment: 'Production',
    description: 'Single cluster to rule them all',
    purpose: 'Web Application',
    resources: [
      kubernetes.cluster.clusterUrn,
      fmsDatabaseCluster.clusterUrn,
      backupStorage.bucketUrn,
    ],
  });

  const domainSlug = 'zth-dev';
  const dnsZone = new cloudflare.Zone(
    `${domainSlug}-zone`,
    {
      name: domain,
      account: {
        id: 'f6f07d41cae3f7e691aeaf018292e276',
      },
      type: 'full',
    },
    {
      protect: true,
    },
  );

  const mxRecords = [
    { name: dnsZone.name, priority: 1, value: 'aspmx.l.google.com' },
    { name: dnsZone.name, priority: 5, value: 'alt1.aspmx.l.google.com' },
    { name: dnsZone.name, priority: 5, value: 'alt2.aspmx.l.google.com' },
    { name: dnsZone.name, priority: 10, value: 'alt3.aspmx.l.google.com' },
    { name: dnsZone.name, priority: 10, value: 'alt4.aspmx.l.google.com' },
  ];

  mxRecords.forEach((record, index) => {
    new cloudflare.DnsRecord(`zth-dev-mx-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'MX',
      content: record.value,
      priority: record.priority,
      ttl: 3600,
    });
  });

  const txtRecords = [
    {
      name: pulumi.interpolate`_dmarc.${dnsZone.name}`,
      ttl: 3600,
      value:
        '"v=DMARC1;  p=none; rua=mailto:60c475918b8b4cb188e919bd2dd2b1b8@dmarc-reports.cloudflare.net;"',
    },
    {
      name: dnsZone.name,
      ttl: 3600,
      value:
        '"google-site-verification=NZG41fnGV15ayrcCJ6-tS1_Qk-BE6Ynhw25KOLnRV7o"',
    },
    {
      name: dnsZone.name,
      ttl: 3600,
      value: '"v=spf1 include:_spf.google.com ~all"',
    },
    {
      name: pulumi.interpolate`google._domainkey.${dnsZone.name}`,
      ttl: 3600,
      value:
        '"v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoTwLIgTUUc24nH1+ZENiCsHrUyvzUOuHt2QaoQohikwT8P2F+tJQ+GtVvFlN8WvysFVznFWGpDtFEObwirUc+sNSGyKjPgfIeig9lhA1iyPz8A16UWxA/xcUBZ3lFR2DtYa1PVfsFiGtLVsy4b/dlZ/kZH9oJdpqqudpzVeoUIaC+HYT4izMxMHy1nLDlgFzt" "ICozPfWVZZkmmUvD792DcnQIperMOQRnRzhWFGE+EBwOsR1szfSCjc+8h8HjPregN7SsGTSYPYYu0nCZDjjXJhFLiZfP6X5bsaAcKxXYKiiRpClDpf01rOzijP5Dpp16OKE9qy9R/p64Zfl67qgJwIDAQAB"',
    },
  ];

  txtRecords.forEach((record, index) => {
    new cloudflare.DnsRecord(`zth-dev-txt-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'TXT',
      content: record.value,
      ttl: record.ttl,
    });
  });

  const hostnames = [dnsZone.name, pulumi.interpolate`*.${dnsZone.name}`];
  pulumi.all(hostnames).apply((hosts) => {
    hosts.forEach((hostname, index) => {
      new cloudflare.DnsRecord(`zth-dev-a-${index}`, {
        zoneId: dnsZone.id,
        name: hostname,
        type: 'A',
        content: '157.245.20.9',
        ttl: 1800,
      });
    });
  });

  const cloudflareAccount = {
    email: 'mate.nakic3@gmail.com',
    token: cloudflareConfig.requireSecret('apiToken'),
  };

  const stremioUrl = pulumi.interpolate`${config.requireSecret('stremioSubdomain')}.${domain}`;

  setupKubernetesResources(
    kubernetes.provider,
    pulumi.interpolate`do-${region}-${kubernetes.cluster.name}`,
    cloudflareAccount,
    fmsDbConnection,
    stremioUrl,
  );

  const kubeconfigPath = process.env['KUBECONFIG'];
  if (kubeconfigPath)
    kubernetes.kubeconfig.apply((kubeconfig) =>
      writeFile(kubeconfigPath, kubeconfig),
    );

  const mysqlClient = createMysqlClientPod({
    namespace: 'default',
    mysqlHost: fmsDatabaseCluster.privateHost,
    mysqlUser: fmsDatabaseCluster.user,
    mysqlPassword: fmsDatabaseCluster.password,
    mysqlPort: fmsDatabaseCluster.port,
    provider: kubernetes.provider,
  });

  return {
    nameservers: dnsZone.nameServers,
    mysqlAttachCommand: pulumi.interpolate`kubectl attach -n ${mysqlClient.metadata.namespace} ${mysqlClient.metadata.name} -c ${mysqlClient.spec.containers[0].name} --stdin --tty`,
  };
}

function setupKubernetesResources(
  provider: k8s.Provider,
  clusterName: pulumi.Input<string>,
  cloudflareAccount: {
    email: pulumi.Input<string>;
    token: pulumi.Input<string>;
  },
  databaseConnection: app.DatabaseConnection,
  stremioUrl: pulumi.Input<string>,
) {
  const config = new pulumi.Config();

  const kubernetesComponentOptions = {
    providers: {
      kubernetes: provider,
    },
  };

  const gatewayAPI = new k8s.yaml.ConfigFile(
    'gateway-api-crd',
    {
      file: 'https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.4.1/experimental-install.yaml',
    },
    { provider },
  );

  new monitoring.GrafanaAlloy(
    'monitoring',
    {
      clusterName,
      cloudAccessPolicyToken: config.requireSecret(
        'grafana-kubernetes-integration-token',
      ),
    },
    kubernetesComponentOptions,
  );

  const gatewayConfig = {
    name: 'default-gateway',
    namespace: 'default',
  };

  const certManager = new security.CertManager(
    'cert-manager',
    {},
    kubernetesComponentOptions,
  );

  const gatewayController = new gateway.EnvoyGateway(
    'envoy-gateway',
    {},
    {
      ...kubernetesComponentOptions,
      dependsOn: [gatewayAPI],
    },
  );

  const cloudflareSecret = new k8s.core.v1.Secret(
    'cloudflare-api-token',
    {
      metadata: {
        namespace: certManager.namespaceName,
      },
      stringData: {
        'api-token': cloudflareAccount.token,
      },
    },
    { provider },
  );

  const certificateSecretName = 'letsencrypt-prod-private-key';
  const issuer = new k8s.apiextensions.CustomResource(
    'letsencrypt-issuer',
    {
      apiVersion: 'cert-manager.io/v1',
      kind: 'ClusterIssuer',
      metadata: {
        name: 'letsencrypt-production',
      },
      spec: {
        acme: {
          server: 'https://acme-v02.api.letsencrypt.org/directory',
          email: cloudflareAccount.email,
          privateKeySecretRef: { name: certificateSecretName },
          solvers: [
            {
              dns01: {
                cloudflare: {
                  apiTokenSecretRef: {
                    name: cloudflareSecret.metadata.name,
                    key: 'api-token',
                  },
                },
              },
            },
          ],
        },
      },
    },
    {
      provider,
      dependsOn: [certManager],
      deleteBeforeReplace: true,
    },
  );

  const certificate = new k8s.apiextensions.CustomResource(
    'zth-dev-certificate',
    {
      apiVersion: 'cert-manager.io/v1',
      kind: 'Certificate',
      metadata: {
        name: 'zth-dev',
      },
      spec: {
        secretName: certificateSecretName,
        issuerRef: {
          name: issuer.metadata.name,
          kind: issuer.kind,
        },
        commonName: domain,
        dnsNames: [
          domain,
          `*.${domain}`,
          zarafleetDomain,
          `*.${zarafleetDomain}`,
        ],
      },
    },
    { provider },
  );

  const gatewayInstance = new k8s.apiextensions.CustomResource(
    'primary-gateway',
    {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'Gateway',
      metadata: {
        name: gatewayConfig.name,
        namespace: gatewayConfig.namespace,
      },
      spec: {
        gatewayClassName: gatewayController.gatewayClassName,
        listeners: [
          {
            name: 'http',
            protocol: 'HTTP',
            port: 80,
            allowedRoutes: {
              namespaces: { from: 'All' },
              kinds: [{ kind: 'HTTPRoute' }],
            },
          },
          {
            name: 'https',
            protocol: 'HTTPS',
            port: 443,
            tls: {
              mode: 'Terminate',
              certificateRefs: [
                {
                  name: certificateSecretName,
                },
              ],
            },
            allowedRoutes: {
              namespaces: { from: 'All' },
              kinds: [{ kind: 'HTTPRoute' }],
            },
          },
          {
            name: 'teltonika',
            protocol: 'TCP',
            port: 8400,
            allowedRoutes: {
              namespaces: { from: 'All' },
              kinds: [{ kind: 'TCPRoute' }],
            },
          },
        ],
      },
    },
    {
      provider,
      deleteBeforeReplace: true,
      dependsOn: [certificate],
    },
  );

  const stremio = new app.StremioServer(
    'stremio',
    {
      cpu: '0.02',
      memory: '400Mi',
    },
    kubernetesComponentOptions,
  );

  new k8s.apiextensions.CustomResource(
    'stremio-route',
    {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'HTTPRoute',
      metadata: {
        namespace: stremio.namespaceName,
      },
      spec: {
        parentRefs: [
          {
            name: gatewayInstance.metadata.name,
            namespace: gatewayInstance.metadata.namespace,
            sectionName: 'https',
          },
        ],
        hostnames: [stremioUrl],
        rules: [
          {
            matches: [
              {
                path: {
                  type: 'PathPrefix',
                  value: '/',
                },
              },
            ],
            backendRefs: [
              {
                name: stremio.serviceName,
                port: stremio.servicePort,
              },
            ],
          },
        ],
      },
    },
    {
      provider,
    },
  );

  const traccar = new app.TraccarServer(
    'traccar',
    {
      databaseConnection: databaseConnection,
      emailPassword: config.requireSecret('traccar-email-password'),
    },
    kubernetesComponentOptions,
  );

  new k8s.apiextensions.CustomResource(
    'traccar-teltonika-route',
    {
      apiVersion: 'gateway.networking.k8s.io/v1alpha2',
      kind: 'TCPRoute',
      metadata: {
        namespace: traccar.namespace.metadata.name,
      },
      spec: {
        parentRefs: [
          {
            name: gatewayInstance.metadata.name,
            namespace: gatewayInstance.metadata.namespace,
            sectionName: 'teltonika',
          },
        ],
        rules: [
          {
            backendRefs: [
              {
                name: traccar.service.metadata.name,
                port: traccar.service.spec.ports[1].port,
              },
            ],
          },
        ],
      },
    },
    {
      provider,
    },
  );

  new k8s.apiextensions.CustomResource(
    'traccar-web-route',
    {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'HTTPRoute',
      metadata: {
        namespace: traccar.namespace.metadata.name,
      },
      spec: {
        parentRefs: [
          {
            name: gatewayInstance.metadata.name,
            namespace: gatewayInstance.metadata.namespace,
            sectionName: 'https',
          },
        ],
        hostnames: [fmsUrl],
        rules: [
          {
            matches: [
              {
                path: {
                  type: 'PathPrefix',
                  value: '/',
                },
              },
            ],
            backendRefs: [
              {
                name: traccar.service.metadata.name,
                port: traccar.service.spec.ports[0].port,
              },
            ],
          },
        ],
      },
    },
    {
      provider,
    },
  );

  const zarafleet = new app.ZaraFleet(
    'zarafleet',
    {
      image: security.resolveRegistryImage(config.require('zarafleet-image')),
    },
    kubernetesComponentOptions,
  );

  const allowFrontendToBackendCommunication =
    new k8s.apiextensions.CustomResource(
      'traccar-grant-frontend',
      {
        apiVersion: 'gateway.networking.k8s.io/v1beta1',
        kind: 'ReferenceGrant',
        metadata: {
          namespace: traccar.namespace.metadata.name,
        },
        spec: {
          from: [
            {
              group: 'gateway.networking.k8s.io',
              kind: 'HTTPRoute',
              namespace: zarafleet.namespace.metadata.name,
            },
          ],
          to: [
            {
              group: '',
              kind: 'Service',
              name: traccar.service.metadata.name,
            },
          ],
        },
      },
      { provider },
    );

  new k8s.apiextensions.CustomResource(
    'zarafleet-web-route',
    {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'HTTPRoute',
      metadata: {
        namespace: zarafleet.namespace.metadata.name,
      },
      spec: {
        parentRefs: [
          {
            name: gatewayInstance.metadata.name,
            namespace: gatewayInstance.metadata.namespace,
            sectionName: 'https',
          },
        ],
        hostnames: [zarafleetUrl],
        rules: [
          {
            matches: [
              {
                path: {
                  type: 'PathPrefix',
                  value: '/api',
                },
              },
            ],
            backendRefs: [
              {
                name: traccar.service.metadata.name,
                namespace: traccar.service.metadata.namespace,
                port: traccar.service.spec.ports[0].port,
              },
            ],
          },
          {
            matches: [
              {
                path: {
                  type: 'PathPrefix',
                  value: '/',
                },
              },
            ],
            backendRefs: [
              {
                name: zarafleet.service.metadata.name,
                port: zarafleet.service.spec.ports[0].port,
              },
            ],
          },
        ],
      },
    },
    {
      provider,
      dependsOn: [allowFrontendToBackendCommunication],
    },
  );
}

export interface MysqlClientPodArgs {
  namespace: pulumi.Input<string>;
  mysqlHost: pulumi.Input<string>;
  mysqlUser: pulumi.Input<string>;
  mysqlPassword: pulumi.Input<string>;
  mysqlPort?: pulumi.Input<number>;
  provider: k8s.Provider;
}

export function createMysqlClientPod(
  args: MysqlClientPodArgs,
): k8s.core.v1.Pod {
  const portEnv = args.mysqlPort
    ? pulumi.interpolate`${args.mysqlPort}`
    : '3306';

  const secret = new k8s.core.v1.Secret(
    'mysql-client-credentials',
    {
      metadata: {
        namespace: args.namespace,
      },
      stringData: {
        MYSQL_HOST: pulumi.secret(args.mysqlHost),
        MYSQL_USER: pulumi.secret(args.mysqlUser),
        MYSQL_PWD: pulumi.secret(args.mysqlPassword),
      },
    },
    { provider: args.provider },
  );

  return new k8s.core.v1.Pod(
    'mysql-client',
    {
      metadata: {
        name: 'mysql-client',
        namespace: args.namespace,
      },
      spec: {
        containers: [
          {
            name: 'mysql-8',
            image:
              'mysql:8-debian@sha256:49f4fcb0087318aa1c222c7e8ceacbb541cdc457c6307d45e6ee4313f4902e33',
            command: [
              'sh',
              '-c',
              // no `-p` flag needed since mysql reads $MYSQL_PWD automatically
              'mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER',
            ],
            env: [
              {
                name: 'MYSQL_HOST',
                valueFrom: {
                  secretKeyRef: {
                    name: secret.metadata.name,
                    key: 'MYSQL_HOST',
                  },
                },
              },
              { name: 'MYSQL_PORT', value: portEnv },
              {
                name: 'MYSQL_USER',
                valueFrom: {
                  secretKeyRef: {
                    name: secret.metadata.name,
                    key: 'MYSQL_USER',
                  },
                },
              },
              {
                name: 'MYSQL_PWD',
                valueFrom: {
                  secretKeyRef: {
                    name: secret.metadata.name,
                    key: 'MYSQL_PWD',
                  },
                },
              },
            ],
            resources: {
              requests: { cpu: '0.001', memory: '30Mi' },
              limits: { memory: '30Mi' },
            },
            stdin: true,
            tty: true,
          },
        ],
      },
    },
    { deleteBeforeReplace: true, provider: args.provider },
  );
}
