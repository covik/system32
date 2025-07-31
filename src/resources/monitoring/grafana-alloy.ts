import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { findHelmDependency } from '../../utils/index.js';

export interface GrafanaAlloyArgs {
  clusterName: pulumi.Input<string>;
  cloudAccessPolicyToken: pulumi.Input<string>;
}

export class GrafanaAlloy extends pulumi.ComponentResource {
  constructor(
    name: string,
    args: GrafanaAlloyArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('fms:monitoring:GrafanaAlloy', name, args, opts);

    const namespace = new k8s.core.v1.Namespace(
      `${name}-ns`,
      {
        metadata: { name: 'grafana-alloy-system' },
      },
      { parent: this },
    );

    const chartSettings = findHelmDependency('k8s-monitoring');
    new k8s.helm.v3.Release(
      `${name}-release`,
      {
        name,
        atomic: true,
        chart: chartSettings.name,
        version: chartSettings.version,
        namespace: namespace.metadata.name,
        repositoryOpts: {
          repo: chartSettings.repository,
        },
        values: {
          'cluster': {
            name: args.clusterName,
          },
          'externalServices': {
            prometheus: {
              host: 'https://prometheus-prod-24-prod-eu-west-2.grafana.net',
              basicAuth: {
                username: '1732483',
                password: args.cloudAccessPolicyToken,
              },
            },
            loki: {
              host: 'https://logs-prod-012.grafana.net',
              basicAuth: {
                username: '965971',
                password: args.cloudAccessPolicyToken,
              },
            },
            tempo: {
              host: 'https://tempo-prod-10-prod-eu-west-2.grafana.net:443',
              basicAuth: {
                username: '960286',
                password: args.cloudAccessPolicyToken,
              },
            },
          },
          'metrics': {
            'enabled': true,
            'alloy': {
              metricsTuning: {
                useIntegrationAllowList: true,
              },
            },
            'cost': {
              enabled: true,
            },
            'kepler': {
              enabled: true,
            },
            'node-exporter': {
              enabled: true,
            },
          },
          'logs': {
            enabled: true,
            pod_logs: {
              enabled: true,
            },
            cluster_events: {
              enabled: true,
            },
          },
          'traces': {
            enabled: true,
          },
          'receivers': {
            grpc: {
              enabled: true,
            },
            http: {
              enabled: true,
            },
            zipkin: {
              enabled: true,
            },
            grafanaCloudMetrics: {
              enabled: false,
            },
          },
          'opencost': {
            enabled: false,
            opencost: {
              exporter: {
                defaultClusterId: 'zth-dev',
              },
              prometheus: {
                external: {
                  url: 'https://prometheus-prod-24-prod-eu-west-2.grafana.net/api/prom',
                },
              },
            },
          },
          'kube-state-metrics': {
            enabled: true,
          },
          'prometheus-node-exporter': {
            enabled: true,
          },
          'prometheus-operator-crds': {
            enabled: true,
          },
          'kepler': {
            enabled: false,
          },
          'alloy': {},
          'alloy-events': {},
          'alloy-logs': {},
        },
      },
      { parent: this },
    );

    this.registerOutputs();
  }
}
