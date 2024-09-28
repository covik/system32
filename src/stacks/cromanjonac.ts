import { writeFile } from 'node:fs/promises';
import * as cloudflare from '@pulumi/cloudflare';
import * as digitalocean from '@pulumi/digitalocean';
import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as grafana from '@pulumiverse/grafana';
import memoryAllocationDashboardJSON from '../memory-allocation-dashboard.json';
import * as app from '../resources/app';
import * as cluster from '../resources/cluster';
import * as gateway from '../resources/gateway';
import * as monitoring from '../resources/monitoring';
import * as security from '../resources/security';
import { createMysqlConnectionString } from '../utils';

const domain = 'zth.dev';
const zarafleetDomain = 'zarafleet.com';
const fmsUrl = `old.${zarafleetDomain}`;
const zarafleetUrl = `app.${zarafleetDomain}`;
const stremioUrl = `01911f8c-8698-7a3d-a960-5f15f55a668c.${domain}`;
const snapshooterIps = [
  '174.138.101.117',
  '143.198.240.52',
  '138.68.117.142',
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
    version: '1.31.1-do.0',
    vmSize: 's-4vcpu-8gb',
    nodePoolName: 'engine',
    nodePoolTags: [],
    token: config.requireSecret('k8s-cluster-token'),
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
    host: fmsDatabaseCluster.privateHost,
    port: fmsDatabaseCluster.port,
    database: fmsDatabase.name,
    user: fmsDatabaseUser.name,
    password: fmsDatabaseUser.password,
  } satisfies app.DatabaseConnection & app.ZaraGPSArguments['db'];

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

  const dnsZone = new cloudflare.Zone(
    'zth-dev-zone',
    {
      zone: domain,
      accountId: 'f6f07d41cae3f7e691aeaf018292e276',
      plan: 'free',
      type: 'full',
    },
    {
      protect: true,
    },
  );

  new cloudflare.ZoneSettingsOverride('zth-dev-security-settings', {
    zoneId: dnsZone.id,
    settings: {
      ssl: 'strict',
      alwaysUseHttps: 'on',
      securityLevel: 'high',
      browserCheck: 'on',
      challengeTtl: 1800,
      // waf: 'on', // needs Pro plan
      opportunisticEncryption: 'on',
      automaticHttpsRewrites: 'on',
      minTlsVersion: '1.2',
    },
  });

  const mxRecords = [
    { name: 'zth.dev', priority: 10, value: 'alt3.aspmx.l.google.com.' },
    { name: 'zth.dev', priority: 10, value: 'alt4.aspmx.l.google.com.' },
    { name: 'zth.dev', priority: 1, value: 'aspmx.l.google.com.' },
    { name: 'zth.dev', priority: 5, value: 'alt1.aspmx.l.google.com.' },
    { name: 'zth.dev', priority: 5, value: 'alt2.aspmx.l.google.com.' },
  ];

  mxRecords.forEach((record, index) => {
    new cloudflare.Record(`zth-dev-mx-${index}`, {
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
      name: '_dmarc',
      ttl: 3600,
      value:
        'v=DMARC1;  p=none; rua=mailto:60c475918b8b4cb188e919bd2dd2b1b8@dmarc-reports.cloudflare.net;',
    },
    {
      name: domain,
      ttl: 3600,
      value:
        'google-site-verification=NZG41fnGV15ayrcCJ6-tS1_Qk-BE6Ynhw25KOLnRV7o',
    },
    {
      name: domain,
      ttl: 3600,
      value: 'v=spf1 include:_spf.google.com ~all',
    },
    {
      name: 'google._domainkey',
      ttl: 3600,
      value:
        'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoTwLIgTUUc24nH1+ZENiCsHrUyvzUOuHt2QaoQohikwT8P2F+tJQ+GtVvFlN8WvysFVznFWGpDtFEObwirUc+sNSGyKjPgfIeig9lhA1iyPz8A16UWxA/xcUBZ3lFR2DtYa1PVfsFiGtLVsy4b/dlZ/kZH9oJdpqqudpzVeoUIaC+HYT4izMxMHy1nLDlgFztICozPfWVZZkmmUvD792DcnQIperMOQRnRzhWFGE+EBwOsR1szfSCjc+8h8HjPregN7SsGTSYPYYu0nCZDjjXJhFLiZfP6X5bsaAcKxXYKiiRpClDpf01rOzijP5Dpp16OKE9qy9R/p64Zfl67qgJwIDAQAB',
    },
  ];

  txtRecords.forEach((record, index) => {
    new cloudflare.Record(`zth-dev-txt-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'TXT',
      content: record.value,
      ttl: record.ttl,
    });
  });

  const hostnames = [dnsZone.zone, pulumi.interpolate`*.${dnsZone.zone}`];
  pulumi.all(hostnames).apply((hosts) => {
    hosts.forEach((hostname, index) => {
      new cloudflare.Record(`zth-dev-a-${index}`, {
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

  setupKubernetesResources(
    kubernetes.provider,
    pulumi.interpolate`do-${region}-${kubernetes.cluster.name}`,
    cloudflareAccount,
    fmsDbConnection,
  );

  const kubeconfigPath = process.env['KUBECONFIG'];
  if (kubeconfigPath)
    kubernetes.kubeconfig.apply((kubeconfig) =>
      writeFile(kubeconfigPath, kubeconfig),
    );

  const dashboard = new grafana.Dashboard(
    'cluster-resource-allocation-overview',
    {
      configJson: JSON.stringify(memoryAllocationDashboardJSON),
      overwrite: true,
    },
  );

  return {
    nameservers: dnsZone.nameServers,
    resourceAllocationDashboard: dashboard.url,
  };
}

function setupKubernetesResources(
  provider: k8s.Provider,
  clusterName: pulumi.Input<string>,
  cloudflareAccount: {
    email: pulumi.Input<string>;
    token: pulumi.Input<string>;
  },
  databaseConnection: app.DatabaseConnection & app.ZaraGPSArguments['db'],
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
      file: 'https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/experimental-install.yaml',
    },
    { provider },
  );

  new monitoring.GrafanaAlloy(
    'monitoring',
    { clusterName },
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
          {
            name: 'minecraft',
            protocol: 'TCP',
            port: 25565,
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

  const minecraft = new app.MinecraftServer(
    'minecraft',
    {
      memory: '1.4Gi',
    },
    kubernetesComponentOptions,
  );

  new k8s.apiextensions.CustomResource(
    'minecraft-route',
    {
      apiVersion: 'gateway.networking.k8s.io/v1alpha2',
      kind: 'TCPRoute',
      metadata: {
        namespace: minecraft.namespaceName,
      },
      spec: {
        parentRefs: [
          {
            name: gatewayInstance.metadata.name,
            namespace: gatewayInstance.metadata.namespace,
            sectionName: 'minecraft',
          },
        ],
        rules: [
          {
            backendRefs: [
              {
                name: minecraft.serviceName,
                port: minecraft.servicePort,
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
      image: security.resolveRegistryImage(
        config.require('frontend-stable-image'),
      ),
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

  const zaragpsHostname = 'zgps.zth.dev';
  const zaragps = new app.ZaraGPS(
    'zaragps',
    {
      image: security.resolveRegistryImage(
        'ghcr.io/sudocovik/gps.zarapromet.hr:latest@sha256:496f3ead6c6696edc47be735a2cc85cba65262a506cdb3a77f1670a49c856d0f',
      ),
      hostname: zaragpsHostname,
      db: databaseConnection,
    },
    kubernetesComponentOptions,
  );

  new k8s.apiextensions.CustomResource(
    'zaragps-route',
    {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'HTTPRoute',
      metadata: {
        namespace: zaragps.namespace.metadata.name,
      },
      spec: {
        parentRefs: [
          {
            name: gatewayInstance.metadata.name,
            namespace: gatewayInstance.metadata.namespace,
            sectionName: 'https',
          },
        ],
        hostnames: [zaragpsHostname],
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
                name: zaragps.service.metadata.name,
                port: zaragps.service.spec.ports[0].port,
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
}
