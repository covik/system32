import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { findHelmDependency } from '../../utils';

export interface MinecraftArgs {
  cpu?: pulumi.Input<string>;
  memory?: pulumi.Input<string>;
}

// Define a custom component for Minecraft deployment
export class MinecraftServer extends pulumi.ComponentResource {
  public namespaceName: pulumi.Output<string>;
  public serviceName: pulumi.Output<string>;
  public servicePort: pulumi.Output<number>;

  constructor(
    name: string,
    args: MinecraftArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:app:Minecraft', name, args, opts);

    const namespace = new k8s.core.v1.Namespace(
      `${name}-ns`,
      {
        metadata: {
          name: 'minecraft-system',
        },
      },
      { parent: this },
    );

    const chartSettings = findHelmDependency('minecraft');
    const release = new k8s.helm.v3.Release(
      `${name}-release`,
      {
        name,
        chart: chartSettings.name,
        version: chartSettings.version,
        namespace: namespace.metadata.name,
        repositoryOpts: {
          repo: chartSettings.repository,
        },
        values: {
          minecraftServer: {
            version: '1.21.3',
            eula: true,
            difficulty: 'normal',
            levelSeed: '1234564332465377',
            motd: 'Welcome, comrade',
            onlineMode: true,
            overrideServerProperties: true,
            ops: 'cromanjonac,Chollo65',
          },
          resources: {
            requests: {
              memory: args.memory ?? '512Mi',
              cpu: args.cpu ?? '500m',
            },
            limits: {
              memory: args.memory ?? '512Mi',
            },
          },

          persistence: {
            dataDir: {
              enabled: true,
            },
          },
        },
      },
      { parent: this },
    );

    const service = k8s.core.v1.Service.get(
      `${name}-service`,
      pulumi.interpolate`${release.status.namespace}/${release.status.name}`,
      {
        parent: this,
      },
    );

    this.namespaceName = namespace.metadata.name;
    this.serviceName = service.metadata.name;
    this.servicePort = service.spec.ports[0].port;

    this.registerOutputs({
      namespaceName: this.namespaceName,
      serviceName: this.serviceName,
      servicePort: this.servicePort,
    });
  }
}
