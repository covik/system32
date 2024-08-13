import { writeFile } from 'node:fs/promises';
import * as civo from '@pulumi/civo';
import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as app from '../resources/app';
import * as cluster from '../resources/cluster';
import * as gateway from '../resources/gateway';
import * as monitoring from '../resources/monitoring';
import * as security from '../resources/security';

const stremioUrl = '01911f8c-8698-7a3d-a960-5f15f55a668c.zth.dev';

export function resources(): unknown {
  const config = new pulumi.Config();

  const network = new civo.Network('primary-vpc', {
    label: 'hq',
  });

  const firewall = new civo.Firewall('primary-defense', {
    name: 'abs',
    networkId: network.id,
  });

  const kubernetes = new cluster.CivoCluster('primary-cluster', {
    firewall,
    name: 'engine',
    network,
    version: '1.29.2-k3s1',
    vmSize: 'g4s.kube.medium',
  });

  const kubeconfigPath = process.env['KUBECONFIG'];
  if (kubeconfigPath)
    kubernetes.kubeconfig.apply((kubeconfig) =>
      writeFile(kubeconfigPath, kubeconfig),
    );

  const kubernetesComponentOptions = {
    providers: {
      kubernetes: kubernetes.provider,
    },
  };

  const gatewayAPI = installKubernetesGatewayAPI({
    provider: kubernetes.provider,
  });

  const gatewayController = new gateway.EnvoyGateway(
    'envoy-gateway',
    {},
    {
      ...kubernetesComponentOptions,
      dependsOn: [gatewayAPI],
    },
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

  const issuer = new k8s.apiextensions.CustomResource(
    'letsencrypt-issuer',
    {
      apiVersion: 'cert-manager.io/v1',
      kind: 'ClusterIssuer',
      metadata: {
        name: 'letsencrypt-prod',
      },
      spec: {
        acme: {
          server: 'https://acme-v02.api.letsencrypt.org/directory',
          email: 'mate.nakic@zth.dev',
          privateKeySecretRef: {
            name: 'default-acme-private-key',
          },
          solvers: [
            {
              http01: {
                gatewayHTTPRoute: {
                  parentRefs: [
                    {
                      name: gatewayConfig.name,
                      namespace: gatewayConfig.namespace,
                      kind: 'Gateway',
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    },
    {
      provider: kubernetes.provider,
      dependsOn: [certManager],
      deleteBeforeReplace: true,
    },
  );

  const certificateSecretName = 'zth-dev-tls';
  const certificate = new k8s.apiextensions.CustomResource(
    'zth-dev-certificate',
    {
      apiVersion: 'cert-manager.io/v1',
      kind: 'Certificate',
      metadata: {
        name: 'zth-dev',
        namespace: gatewayConfig.namespace,
      },
      spec: {
        secretName: certificateSecretName,
        issuerRef: {
          name: issuer.metadata.name,
          kind: issuer.kind,
        },
        dnsNames: ['zth.dev', stremioUrl],
      },
    },
    {
      provider: kubernetes.provider,
      deleteBeforeReplace: true,
    },
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
      provider: kubernetes.provider,
      deleteBeforeReplace: true,
      dependsOn: [certificate],
    },
  );

  const appLabels = { app: 'nginx' };

  const deployment = new k8s.apps.v1.Deployment(
    'nginx-deployment',
    {
      metadata: { name: 'nginx' },
      spec: {
        selector: { matchLabels: appLabels },
        replicas: 1,
        template: {
          metadata: { labels: appLabels },
          spec: {
            containers: [
              {
                name: 'nginx',
                image: 'nginx:latest',
                ports: [{ containerPort: 80 }],
              },
            ],
          },
        },
      },
    },
    {
      provider: kubernetes.provider,
    },
  );

  const service = new k8s.core.v1.Service(
    'nginx-service',
    {
      metadata: { name: 'nginx' },
      spec: {
        ports: [
          {
            port: 80,
            targetPort:
              deployment.spec.template.spec.containers[0].ports[0]
                .containerPort,
          },
        ],
        selector: appLabels,
      },
    },
    {
      provider: kubernetes.provider,
    },
  );

  new k8s.apiextensions.CustomResource(
    'nginx-route',
    {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'HTTPRoute',
      spec: {
        parentRefs: [
          {
            name: gatewayInstance.metadata.name,
            sectionName: 'https',
          },
        ],
        hostnames: ['zth.dev'],
        rules: [
          {
            matches: [
              {
                path: {
                  type: 'Exact',
                  value: '/',
                },
              },
            ],
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
    {
      provider: kubernetes.provider,
    },
  );

  const stremio = new app.StremioServer(
    'stremio',
    {},
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
      provider: kubernetes.provider,
    },
  );

  new monitoring.GrafanaAlloy('monitoring', {}, kubernetesComponentOptions);

  /*new backend.TeltonikaServer(
    'teltonika',
    {
      containerRegistryCredentials: createContainerRegistryCredentials(config),
      image:
        'ghcr.io/sudocovik/fms-backend:latest@sha256:c472e7ce6da6f2d335056271480c379d9d1603d89ca19b536a1fc1073c8e69c9',
      gatewayClassName: gateway.gatewayClassName,
    },
    kubernetesComponentOptions,
  );*/

  return {};
}

function installKubernetesGatewayAPI({ provider }: { provider: k8s.Provider }) {
  return new k8s.yaml.ConfigFile(
    'gateway-api-crd',
    {
      file: 'https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/experimental-install.yaml',
    },
    { provider },
  );
}
