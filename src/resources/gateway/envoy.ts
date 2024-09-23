import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { findHelmDependency } from '../../utils';

export interface EnvoyGatewayArguments {}

export class EnvoyGateway extends pulumi.ComponentResource {
  public gatewayClassName: pulumi.Output<string>;

  public constructor(
    name: string,
    args: EnvoyGatewayArguments,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:gateway:Envoy', name, args, opts);

    const namespace = new k8s.core.v1.Namespace(
      `${name}-ns`,
      {
        metadata: {
          name: 'envoy-system',
        },
      },
      { parent: this, deleteBeforeReplace: true },
    );

    const chartSettings = findHelmDependency('gateway-helm');
    const chart = new k8s.helm.v3.Release(
      `${name}-release`,
      {
        name,
        chart: `${chartSettings.repository}/${chartSettings.name}`,
        version: chartSettings.version,
        namespace: namespace.metadata.name,
      },
      {
        parent: this,
        deleteBeforeReplace: true,
        customTimeouts: {
          create: '8m',
        },
      },
    );

    const gatewayClass = new k8s.apiextensions.CustomResource(
      `${name}-gateway-class`,
      {
        apiVersion: 'gateway.networking.k8s.io/v1',
        kind: 'GatewayClass',
        metadata: {
          name,
          namespace: namespace.metadata.name,
        },
        spec: {
          controllerName: 'gateway.envoyproxy.io/gatewayclass-controller',
        },
      },
      {
        parent: this,
        dependsOn: chart,
        deleteBeforeReplace: true,
      },
    );

    this.gatewayClassName = gatewayClass.metadata.name;

    this.registerOutputs({
      gatewayClassName: this.gatewayClassName,
    });
  }
}
