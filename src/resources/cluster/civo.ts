import * as civo from '@pulumi/civo';
import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

export interface CivoClusterArguments {
  firewall: civo.Firewall;
  name: pulumi.Input<string>;
  network: civo.Network;
  version: pulumi.Input<string>;
  vmSize: pulumi.Input<string>;
}

export class CivoCluster extends pulumi.ComponentResource {
  public kubeconfig: pulumi.Output<string>;
  public provider: k8s.Provider;

  public constructor(
    name: string,
    args: CivoClusterArguments,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:kubernetes:Civo', name, args, opts);

    const { firewall, name: clusterName, network, version, vmSize } = args;

    const cluster = new civo.KubernetesCluster(
      'k3s-cluster',
      {
        cni: 'cilium',
        clusterType: 'k3s',
        firewallId: firewall.id,
        kubernetesVersion: version,
        pools: {
          nodeCount: 1,
          size: vmSize,
        },
        name: clusterName,
        networkId: network.id,
      },
      { parent: this },
    );

    const provider = new k8s.Provider(
      'civo-k8s-provider',
      {
        kubeconfig: cluster.kubeconfig,
        enableServerSideApply: true,
      },
      { parent: this },
    );

    this.kubeconfig = cluster.kubeconfig;
    this.provider = provider;

    this.registerOutputs({
      kubeconfig: this.kubeconfig,
      provider: this.provider,
    });
  }
}
