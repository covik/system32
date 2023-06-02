/* eslint-disable no-new */
import * as digitalocean from '@pulumi/digitalocean';
import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as backend from '../resources/backend';
import * as frontend from '../resources/frontend';
import {
  createContainerRegistryCredentials,
  resolveRegistryImage,
} from '../utils';
import type { DatabaseConnectionSettings } from '../resources/backend';

const config = new pulumi.Config();

class Domain {
  public static primary = 'zarafleet.com';
  public static frontend = 'app.zarafleet.com';
  public static traccar = 'old.zarafleet.com';
  public static newFrontend = 'next.zarafleet.com';
}

class Project {
  public static nameLowercase = 'fms';
}

class LoadBalancer {
  public static title: string = Project.nameLowercase;
  public static size = 'lb-small';
  public static ports = {
    http: {
      external: 80,
      internal: 32080,
    },
    https: {
      external: 443,
      internal: 32080,
    },
    teltonika: {
      external: 5027,
      internal: 32027,
    },
  };
}

class Kubernetes {
  public static version = '1.24.12';
  public static traefikVersion = '10.6.2';
}

class Cluster {
  public static title: string = Project.nameLowercase;
  public static version = `${Kubernetes.version}-do.0`;
  public static readToken: pulumi.Output<string> =
    config.requireSecret('k8s-cluster-token');
  public static nodePool = {
    title: 'worker',
    size: 's-1vcpu-2gb',
    count: 1,
    tag: `${Cluster.title}-worker`,
  };
}

function generateKubeconfig(
  cluster: digitalocean.KubernetesCluster,
  user: pulumi.Input<string>,
  apiToken: pulumi.Input<string>,
): pulumi.Output<string> {
  const clusterName = pulumi.interpolate`do-${cluster.region}-${cluster.name}`;

  const certificate = cluster.kubeConfigs[0].clusterCaCertificate;

  return pulumi.interpolate`apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${certificate}
    server: ${cluster.endpoint}
  name: ${clusterName}
contexts:
- context:
    cluster: ${clusterName}
    user: ${clusterName}-${user}
  name: ${clusterName}
current-context: ${clusterName}
kind: Config
users:
- name: ${clusterName}-${user}
  user:
    token: ${apiToken}
`;
}

export function resources(): void {
  const region = config.require('region');

  const domain = new digitalocean.Domain('primary-domain', {
    name: Domain.primary,
  });
  const certificate = new digitalocean.Certificate(
    'certificate',
    {
      domains: [domain.name, pulumi.interpolate`*.${domain.name}`],
      type: 'lets_encrypt',
    },
    {
      parent: domain,
    },
  );
  const loadBalancer = new digitalocean.LoadBalancer('primary-load-balancer', {
    name: LoadBalancer.title,
    region,
    size: LoadBalancer.size,
    dropletTag: Cluster.nodePool.tag,
    redirectHttpToHttps: true,
    algorithm: 'round_robin',
    forwardingRules: [
      {
        entryProtocol: 'http',
        targetProtocol: 'http',
        entryPort: LoadBalancer.ports.http.external,
        targetPort: LoadBalancer.ports.http.internal,
      },
      {
        entryProtocol: 'https',
        targetProtocol: 'http',
        entryPort: LoadBalancer.ports.https.external,
        targetPort: LoadBalancer.ports.https.internal,
        certificateName: certificate.name,
      },
      {
        entryProtocol: 'tcp',
        targetProtocol: 'tcp',
        entryPort: LoadBalancer.ports.teltonika.external,
        targetPort: LoadBalancer.ports.teltonika.internal,
      },
    ],
    healthcheck: {
      port: LoadBalancer.ports.http.internal,
      protocol: 'http',
      path: '/',
      checkIntervalSeconds: 10,
      responseTimeoutSeconds: 5,
      unhealthyThreshold: 3,
      healthyThreshold: 3,
    },
  });
  new digitalocean.DnsRecord(
    'wildcard-subdomain',
    {
      name: '*',
      domain: domain.name,
      type: 'A',
      value: loadBalancer.ip,
    },
    {
      parent: domain,
    },
  );

  const cluster = new digitalocean.KubernetesCluster('primary-cluster', {
    name: Cluster.title,
    region,
    version: Cluster.version,
    autoUpgrade: false,
    nodePool: {
      name: Cluster.nodePool.title,
      size: Cluster.nodePool.size,
      tags: [Cluster.nodePool.tag],
      nodeCount: Cluster.nodePool.count,
      autoScale: false,
    },
  });
  const kubeconfig = generateKubeconfig(cluster, 'admin', Cluster.readToken);
  const provider = createK8sProvider(kubeconfig, cluster);
  const namespace = createNamespace('vfm', provider);

  const containerRegistryCredentials =
    createContainerRegistryCredentials(config);

  const containerRegistry = new k8s.core.v1.Secret(
    'container-registry-credentials',
    {
      metadata: {
        name: 'container-registry',
        namespace: namespace.metadata.name,
      },
      type: 'kubernetes.io/dockerconfigjson',
      data: {
        '.dockerconfigjson': containerRegistryCredentials.apply((credentials) =>
          Buffer.from(credentials.toJSON()).toString('base64'),
        ),
      },
    },
    { provider, parent: namespace },
  );

  createOldFrontend(provider, namespace, containerRegistry);

  const databaseCluster = new digitalocean.DatabaseCluster(
    'database-cluster',
    {
      engine: 'mysql',
      name: 'vfm',
      nodeCount: 1,
      region,
      size: 'db-s-1vcpu-1gb',
      version: '8',
    },
    {
      protect: true,
    },
  );
  new digitalocean.DatabaseFirewall(
    'database-firewall',
    {
      clusterId: databaseCluster.id,
      rules: [
        {
          type: 'k8s',
          value: cluster.id,
        },
      ],
    },
    {
      parent: databaseCluster,
      protect: true,
    },
  );
  const databaseUser = new digitalocean.DatabaseUser(
    'database-user',
    {
      clusterId: databaseCluster.id,
      name: 'regular',
    },
    {
      parent: databaseCluster,
      protect: true,
    },
  );
  const database = new digitalocean.DatabaseDb(
    'database',
    {
      clusterId: databaseCluster.id,
      name: 'vfm',
    },
    {
      parent: databaseCluster,
      protect: true,
    },
  );
  const databaseConnection: DatabaseConnectionSettings = {
    host: databaseCluster.privateHost,
    port: databaseCluster.port,
    user: databaseUser.name,
    password: databaseUser.password,
    database: database.name,
  };

  new digitalocean.Project('primary-project', {
    name: 'FMS',
    environment: 'Production',
    description: 'Infrastructure for Zara Fleet Management System',
    purpose: 'Web Application',
    resources: [
      domain.domainUrn,
      cluster.clusterUrn,
      loadBalancer.loadBalancerUrn,
      databaseCluster.clusterUrn,
    ],
  });

  createTraefik(
    Kubernetes.traefikVersion,
    LoadBalancer.ports.http.internal,
    namespace,
    provider,
  );

  const kubernetesComponentOptions = {
    parent: provider,
    providers: {
      kubernetes: provider,
    },
  };

  new backend.Application(
    'traccar',
    {
      databaseConnection,
      routes: ['/api', `${Domain.traccar}/`, `${Domain.newFrontend}/api`],
      teltonikaNodePort: 32027,
      emailPassword: config.requireSecret('backend-email-password'),
    },
    kubernetesComponentOptions,
  );

  const unstableFrontendImage = resolveRegistryImage(
    config.require('frontend-unstable-image'),
    config,
  );

  new frontend.Application(
    'zara',
    {
      image: unstableFrontendImage,
      containerRegistryCredentials,
      hostname: Domain.newFrontend,
    },
    kubernetesComponentOptions,
  );
}

function createK8sProvider(
  kubeconfig: pulumi.Output<string>,
  parent: pulumi.Resource,
): k8s.Provider {
  return new k8s.Provider(
    'kubernetes-provider',
    {
      kubeconfig,
      enableServerSideApply: false,
    },
    { parent },
  );
}

function createNamespace(
  name: string,
  provider: k8s.Provider,
): k8s.core.v1.Namespace {
  return new k8s.core.v1.Namespace(
    'primary-namespace',
    { metadata: { name } },
    { provider, parent: provider },
  );
}

function createTraefik(
  version: string,
  nodePort: number,
  namespace: k8s.core.v1.Namespace,
  provider: k8s.Provider,
): k8s.helm.v3.Chart {
  interface TraefikResource {
    kind: string;
    metadata: {
      namespace: pulumi.Input<string>;
      annotations: Record<string, unknown>;
    };
  }

  return new k8s.helm.v3.Chart(
    'ingress-controller',
    {
      chart: 'traefik',
      version,
      fetchOpts: {
        repo: 'https://helm.traefik.io/traefik',
      },
      namespace: namespace.metadata.name,
      values: {
        service: {
          type: 'NodePort',
        },
        ports: {
          web: {
            nodePort,
          },
          websecure: {
            expose: false,
          },
        },
        ingressRoute: {
          dashboard: {
            enabled: false,
          },
        },
      },
      transformations: [
        (obj: TraefikResource) => {
          if (obj.kind === 'Service')
            obj.metadata.namespace = namespace.metadata.name;
        },

        (obj: TraefikResource) => {
          if (obj.kind === 'Service') {
            obj.metadata.annotations = {
              'kubernetes.digitalocean.com/firewall-managed': 'false',
            };
          }
        },
      ],
    },
    { provider, parent: namespace },
  );
}

function createOldFrontend(
  provider: k8s.Provider,
  namespace: k8s.core.v1.Namespace,
  containerRegistry: k8s.core.v1.Secret,
): void {
  const labels = { app: 'old-frontend' };

  const deployment = new k8s.apps.v1.Deployment(
    'old-frontend-application',
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
            containers: [
              {
                name: 'webserver',
                image: 'ghcr.io/covik/tracking-frontend:0.0.14',
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
    {
      provider,
      parent: namespace,
    },
  );

  const service = new k8s.core.v1.Service(
    'old-frontend-http-service',
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
    {
      provider,
      parent: namespace,
    },
  );

  new k8s.networking.v1.Ingress(
    'old-frontend-ingress',
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
    {
      provider,
      parent: namespace,
    },
  );
}
