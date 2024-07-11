import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

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
          name: 'envoy-gateway',
        },
      },
      { parent: this },
    );

    const chart = new k8s.helm.v3.Release(
      `${name}-release`,
      {
        name: 'envoy-gateway',
        chart: 'oci://registry-1.docker.io/envoyproxy/gateway-helm',
        version: 'v1.0.2',
        namespace: namespace.metadata.name,
      },
      { parent: this },
    );

    const gatewayClass = new k8s.apiextensions.CustomResource(
      `${name}-gateway-class`,
      {
        apiVersion: 'gateway.networking.k8s.io/v1',
        kind: 'GatewayClass',
        metadata: {
          name: 'eg',
          namespace: namespace.metadata.name,
        },
        spec: {
          controllerName: 'gateway.envoyproxy.io/gatewayclass-controller',
        },
      },
      {
        parent: this,
        dependsOn: chart,
      },
    );

    this.gatewayClassName = gatewayClass.metadata.name;

    this.registerOutputs({
      gatewayClassName: this.gatewayClassName,
    });
  }
}
