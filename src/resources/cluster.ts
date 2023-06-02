import * as digitalocean from '@pulumi/digitalocean';
import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

export interface ClusterArguments {
  name: pulumi.Input<string>;
  region: digitalocean.KubernetesClusterArgs['region'];
  nodePoolTags: pulumi.Input<string[]>;
  version: digitalocean.KubernetesClusterArgs['version'];
  vpc: digitalocean.Vpc;
  token: pulumi.Input<string>;
}

export class DigitalOceanCluster extends pulumi.ComponentResource {
  public cluster: digitalocean.KubernetesCluster;
  public kubeconfig: pulumi.Output<string>;
  public provider: k8s.Provider;

  public constructor(
    name: string,
    args: ClusterArguments,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:kubernetes:DigitalOcean', name, args, opts);

    const cluster = new digitalocean.KubernetesCluster('k8s-cluster', {
      name: args.name,
      region: args.region,
      nodePool: {
        name: 'production-worker',
        size: 's-1vcpu-2gb',
        nodeCount: 1,
        autoScale: false,
        tags: args.nodePoolTags,
      },
      vpcUuid: args.vpc.id,
      version: args.version,
      autoUpgrade: false,
      ha: false,
      surgeUpgrade: true,
      maintenancePolicy: {
        day: 'sunday',
        startTime: '03:00',
      },
    });

    const kubeconfig = generateKubeconfig(cluster, 'admin', args.token);
    const provider = new k8s.Provider('do-k8s-provider', {
      kubeconfig,
      enableServerSideApply: true,
    });

    this.cluster = cluster;
    this.kubeconfig = kubeconfig;
    this.provider = provider;

    this.registerOutputs({
      cluster,
      kubeconfig,
      provider,
    });
  }
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
