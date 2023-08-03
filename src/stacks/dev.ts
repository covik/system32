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
} from '../utils';

export function resources(): void {
  const config = new pulumi.Config();

  const region = config.require('region');
  const httpNodePort = 32080;
  const teltonikaNodePort = 32027;

  const vpc = new digitalocean.Vpc('primary-vpc', {
    name: 'fms-dev',
    region,
  });

  const kubernetes = new cluster.DigitalOceanCluster(
    'primary-kubernetes-cluster',
    {
      name: 'fms-dev',
      version: '1.27.4-do.0',
      vmSize: 's-1vcpu-2gb',
      nodePoolName: 'dev-worker',
      nodePoolTags: [],
      token: config.requireSecret('k8s-cluster-token'),
      region,
      vpc,
    },
  );

  new digitalocean.Project('primary-project', {
    name: 'FMS Dev',
    environment: 'Development',
    description: 'Infrastructure for Zara Fleet Management System',
    purpose: 'Web Application',
    resources: [kubernetes.cluster.clusterUrn],
  });

  const ipAddress = getNodeIpAddress(kubernetes.cluster);
  const primaryDomainId = getRootDomainId();

  const domain = new digitalocean.DnsRecord('domain', {
    name: 'dev',
    domain: primaryDomainId,
    value: ipAddress,
    type: 'A',
  });

  const kubernetesComponentOptions = {
    providers: {
      kubernetes: kubernetes.provider,
    },
  };

  const containerRegistryCredentials =
    createContainerRegistryCredentials(config);

  const frontendImageNext = resolveRegistryImage(
    config.require('frontend-unstable-image'),
    config,
  );

  new traefik.IngressController(
    'traefik-ingress',
    { nodePort: httpNodePort },
    kubernetesComponentOptions,
  );

  new frontend.Application(
    'zara-fleet-next',
    {
      image: frontendImageNext,
      containerRegistryCredentials,
      namespace: 'frontend-next',
      hostname: domain.fqdn,
    },
    kubernetesComponentOptions,
  );

  const databaseConnection = mysql.kubernetes('mysql:8', kubernetes.provider);

  new backend.Application(
    'traccar',
    {
      databaseConnection,
      routes: ['dev.zarafleet.com/api'],
      teltonikaNodePort,
    },
    kubernetesComponentOptions,
  );
}

function getNodeIpAddress(
  cluster: digitalocean.KubernetesCluster,
): pulumi.Output<string> {
  return cluster.nodePool.nodes[0].dropletId.apply((id) =>
    digitalocean.getDropletOutput({ id: Number(id) }),
  ).ipv4Address;
}

function getRootDomainId(): pulumi.Output<string> {
  return digitalocean.getDomainOutput({ name: 'zarafleet.com' }).id;
}
