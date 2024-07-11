/* eslint-disable no-new */
import * as digitalocean from '@pulumi/digitalocean';
import * as pulumi from '@pulumi/pulumi';
import * as backend from '../resources/backend';
import * as cluster from '../resources/cluster';
import * as frontend from '../resources/frontend';
import * as mysql from '../resources/mysql';
import * as traefik from '../resources/traefik';
import {
  createContainerRegistryCredentials,
  resolveRegistryImage,
  unmanagedFirewall as preventInternetAccessToNodes,
} from '../utils';

class Domain {
  public static primary = 'zarafleet.com';
  public static app = 'app.zarafleet.com';
  public static traccar = 'old.zarafleet.com';
  public static appNext = 'next.zarafleet.com';
}

export function resources(): void {
  const projectName = pulumi.getProject();
  const config = new pulumi.Config();

  const region = config.require('region');
  const clusterNodeTag = 'production-worker';
  const ports = {
    http: 80,
    https: 443,
    teltonika: 5027,
  } as const;
  const httpNodePort = 32080;
  const teltonikaNodePort = 32027;

  const vpc = new digitalocean.Vpc('primary-vpc', {
    name: 'fms-production',
    region,
  });

  const domain = new digitalocean.Domain('primary-domain', {
    name: Domain.primary,
  });
  const certificate = new digitalocean.Certificate(
    'certificate',
    {
      domains: [domain.name, pulumi.interpolate`*.${domain.name}`],
      type: 'lets_encrypt',
    },
    { parent: domain },
  );
  const loadBalancer = new digitalocean.LoadBalancer('primary-load-balancer', {
    name: projectName,
    region,
    size: 'lb-small',
    vpcUuid: vpc.id,
    dropletTag: clusterNodeTag,
    redirectHttpToHttps: true,
    forwardingRules: [
      {
        entryProtocol: 'http',
        targetProtocol: 'http',
        entryPort: ports.http,
        targetPort: httpNodePort,
      },
      {
        entryProtocol: 'https',
        targetProtocol: 'http',
        entryPort: ports.https,
        targetPort: httpNodePort,
        certificateName: certificate.name,
      },
      {
        entryProtocol: 'tcp',
        targetProtocol: 'tcp',
        entryPort: ports.teltonika,
        targetPort: teltonikaNodePort,
      },
    ],
    healthcheck: {
      port: httpNodePort,
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
    { parent: domain },
  );

  const kubernetes = new cluster.DigitalOceanCluster(
    'primary-kubernetes-cluster',
    {
      name: 'fms',
      version: '1.30.2-do.0',
      vmSize: 's-1vcpu-2gb',
      nodePoolName: 'production-worker',
      nodePoolTags: [clusterNodeTag],
      token: config.requireSecret('k8s-cluster-token'),
      region,
      vpc,
    },
  );

  const snapshooterIps = [
    '174.138.101.117',
    '143.198.240.52',
    '138.68.117.142',
  ] as const;
  const database = new mysql.DigitalOceanCluster('primary-database', {
    restrictTo: [kubernetes.cluster, ...snapshooterIps],
    region,
    vpc,
  });

  const backupStorage = new digitalocean.SpacesBucket('fms-backup', {
    name: 'fms-backup',
    acl: 'private',
    region,
  });

  new digitalocean.Project('primary-project', {
    name: 'FMS',
    environment: 'Production',
    description: 'Infrastructure for Zara Fleet Management System',
    purpose: 'Web Application',
    resources: [
      domain.domainUrn,
      loadBalancer.loadBalancerUrn,
      database.cluster.clusterUrn,
      kubernetes.cluster.clusterUrn,
      backupStorage.bucketUrn,
    ],
  });

  const kubernetesComponentOptions = {
    providers: {
      kubernetes: kubernetes.provider,
    },
  };

  new traefik.IngressController(
    'traefik-ingress',
    {
      nodePort: httpNodePort,
      annotations: preventInternetAccessToNodes,
    },
    kubernetesComponentOptions,
  );

  new backend.Application(
    'traccar',
    {
      databaseConnection: database.connection,
      emailPassword: config.requireSecret('backend-email-password'),
      routes: [
        '/api',
        `${Domain.traccar}/`,
        `${Domain.app}/api`,
        `${Domain.appNext}/api`,
      ],
      teltonikaNodePort,
    },
    kubernetesComponentOptions,
  );

  const containerRegistryCredentials =
    createContainerRegistryCredentials(config);

  const frontendImageStable = resolveRegistryImage(
    config.require('frontend-stable-image'),
    config,
  );

  const frontendImageNext = resolveRegistryImage(
    config.require('frontend-unstable-image'),
    config,
  );

  new frontend.Application(
    'zara-fleet',
    {
      image: frontendImageStable,
      containerRegistryCredentials,
      hostname: Domain.app,
    },
    kubernetesComponentOptions,
  );

  new frontend.Application(
    'zara-fleet-next',
    {
      image: frontendImageNext,
      containerRegistryCredentials,
      namespace: 'frontend-next',
    },
    kubernetesComponentOptions,
  );
}
