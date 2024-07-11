import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

export interface IstioArguments {}

export class IstioGateway extends pulumi.ComponentResource {
  public ip: pulumi.Output<string>;
  public gatewayClassName: pulumi.Output<string>;
  public loadBalancerResourceName: pulumi.Output<string>;
  public namespace: pulumi.Output<string>;

  public constructor(
    name: string,
    args: IstioArguments,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:mesh:Istio', name, args, opts);

    const namespace = new k8s.core.v1.Namespace(
      `${name}-ns`,
      {
        metadata: {
          name: 'istio-system',
        },
      },
      { parent: this },
    );

    const commonConfig = {
      version: '1.22.2',
      repositoryOpts: {
        repo: 'https://istio-release.storage.googleapis.com/charts',
      },
      namespace: namespace.metadata.name,
    };

    // Install Istio base
    const base = new k8s.helm.v3.Release(
      `${name}-control-plane`,
      {
        name: 'istio-base',
        chart: 'base',
        ...commonConfig,
        values: {
          defaultRevision: 'default',
        },
      },
      { parent: this },
    );

    // Install Istio discovery / control plane
    const pilot = new k8s.helm.v3.Release(
      `${name}-discovery`,
      {
        name: 'istiod',
        chart: 'istiod',
        ...commonConfig,
        values: {
          profile: 'ambient',
          pilot: {
            env: {
              PILOT_ENABLE_ALPHA_GATEWAY_API: 'true',
            },
          },
        },
      },
      { parent: this, dependsOn: [base] },
    );

    // Install Istio ingress gateway
    const ingress = new k8s.helm.v3.Release(
      `${name}-gateway`,
      {
        name: 'istio-gateway',
        chart: 'gateway',
        ...commonConfig,
        values: {
          service: {
            annotations: {
              'service.beta.kubernetes.io/do-loadbalancer-name': 'trailer',
            },
            ports: [
              {
                name: 'status-port',
                port: 15021,
                protocol: 'TCP',
                targetPort: 15021,
              },
              {
                name: 'http2',
                port: 80,
                protocol: 'TCP',
                targetPort: 80,
              },
              {
                name: 'https',
                port: 443,
                protocol: 'TCP',
                targetPort: 443,
              },
              {
                name: 'teltonika',
                port: 8400,
                protocol: 'TCP',
                targetPort: 8400,
              },
            ],
          },
        },
      },
      { parent: this, dependsOn: [pilot] },
    );

    const ingressService = k8s.core.v1.Service.get(
      `${name}-load-balancer`,
      pulumi.interpolate`${ingress.status.namespace}/${ingress.status.name}`,
      {
        parent: this,
      },
    );

    this.ip = ingressService.status.loadBalancer.ingress[0].ip;
    this.gatewayClassName = pulumi.output('istio');
    this.loadBalancerResourceName = ingress.status.name;
    this.namespace = namespace.metadata.name;

    this.registerOutputs({
      ip: this.ip,
      gatewayClassName: this.gatewayClassName,
      loadBalancerResourceName: this.loadBalancerResourceName,
      namespace: this.namespace,
    });
  }
}
