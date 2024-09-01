import * as digitalocean from '@pulumi/digitalocean';
import * as pulumi from '@pulumi/pulumi';
import { createConnectionString } from './utils';

export interface DigitaloceanClusterArgs {
  db: {
    name: pulumi.Input<string>;
    username: pulumi.Input<string>;
  };
  name: pulumi.Input<string>;
  region: digitalocean.DatabaseClusterArgs['region'];
  restrictTo: digitalocean.KubernetesCluster;
  size: digitalocean.DatabaseClusterArgs['size'];
  version: pulumi.Input<string>;
  vpc: digitalocean.Vpc;
  nodeCount?: pulumi.Input<number>;
  protectResources?: boolean;
}

export class DigitalOceanCluster extends pulumi.ComponentResource {
  public cluster: digitalocean.DatabaseCluster;
  public connectionString: pulumi.Output<string>;

  public constructor(
    name: string,
    args: DigitaloceanClusterArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:postgresql:DigitalOcean', name, args, opts);

    const commonOptions: pulumi.ResourceOptions = {
      parent: this,
      protect: args.protectResources ?? true,
    };

    const cluster = new digitalocean.DatabaseCluster(
      `${name}-cluster`,
      {
        name: args.name,
        engine: 'pg',
        version: args.version,
        size: args.size,
        nodeCount: args.nodeCount ?? 1,
        privateNetworkUuid: args.vpc.id,
        maintenanceWindows: [
          {
            day: 'sunday',
            hour: '03:00:00',
          },
        ],
        region: args.region,
      },
      commonOptions,
    );

    const user = new digitalocean.DatabaseUser(
      `${name}-user`,
      {
        name: args.db.username,
        clusterId: cluster.id,
      },
      commonOptions,
    );

    const database = new digitalocean.DatabaseDb(
      `${name}-db`,
      {
        name: args.db.name,
        clusterId: cluster.id,
      },
      commonOptions,
    );

    new digitalocean.DatabaseFirewall(
      `${name}-firewall`,
      {
        rules: [
          {
            type: 'k8s',
            value: args.restrictTo.id,
          },
        ],
        clusterId: cluster.id,
      },
      commonOptions,
    );

    const connectionString = createConnectionString({
      host: cluster.privateHost,
      port: cluster.port,
      username: user.name,
      password: user.password,
      database: database.name,
    });

    this.cluster = cluster;
    this.connectionString = connectionString;

    this.registerOutputs({
      cluster,
      connectionString,
    });
  }
}
