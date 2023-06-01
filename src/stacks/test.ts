import * as digitalocean from '@pulumi/digitalocean';
import * as k8s from '@pulumi/kubernetes';
import * as traefik from '../resources/traefik';
import type * as pulumi from '@pulumi/pulumi';

export function resources(): void {
  const vpc = new digitalocean.Vpc('primary-vpc', {
    name: 'fms-test',
    region: 'fra1',
  });

  const cluster = new digitalocean.KubernetesCluster('primary-cluster', {
    name: 'fms-test',
    region: 'fra1',
    version: '1.27.2-do.0',
    nodePool: {
      name: 'test-worker',
      size: 's-1vcpu-2gb',
      nodeCount: 1,
      autoScale: false,
    },
    vpcUuid: vpc.id,
    ha: false,
    autoUpgrade: false,
    surgeUpgrade: true,
  });

  new digitalocean.Project('primary-project', {
    name: 'FMS-test',
    environment: 'Development',
    description: 'Infrastructure for Zara Fleet Management System',
    purpose: 'Web Application',
    resources: [cluster.clusterUrn],
  });

  const ipAddress = getNodeIpAddress(cluster);
  const primaryDomainId = getRootDomainId();

  new digitalocean.DnsRecord('domain', {
    name: 'test',
    domain: primaryDomainId,
    value: ipAddress,
    type: 'A',
  });

  const provider = new k8s.Provider('do-cluster', {
    kubeconfig: cluster.kubeConfigs[0].rawConfig,
    enableServerSideApply: true,
  });

  const kubernetesComponentOptions = {
    providers: {
      kubernetes: provider,
    },
  };

  new traefik.IngressController(
    'traefik-ingress',
    { nodePort: 30080 },
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
