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
          'destinations': [
            {
              name: 'metricsService',
              type: 'prometheus',
              url: 'https://prometheus-prod-24-prod-eu-west-2.grafana.net/api/prom/push',
              auth: {
                type: 'basic',
                username: '1732483',
                password: args.cloudAccessPolicyToken,
              },
            },
            {
              name: 'logsService',
              type: 'loki',
              url: 'https://logs-prod-012.grafana.net/loki/api/v1/push',
              auth: {
                type: 'basic',
                username: '965971',
                password: args.cloudAccessPolicyToken,
              },
            },
            {
              name: 'tracesService',
              type: 'otlp',
              metrics: { enabled: false },
              logs: { enabled: false },
              traces: { enabled: true },
              url: 'https://tempo-prod-10-prod-eu-west-2.grafana.net:443',
              auth: {
                type: 'basic',
                username: '960286',
                password: args.cloudAccessPolicyToken,
              },
            },
          ],
          'clusterMetrics': {
            'enabled': true,
            'kube-state-metrics': { deploy: true },
            'node-exporter': { deploy: true, enabled: true },
            'windows-exporter': { deploy: false, enabled: false },
            'opencost': {
              enabled: false,
              opencost: {
                exporter: { defaultClusterId: 'zth-dev' },
                prometheus: {
                  external: {
                    url: 'https://prometheus-prod-24-prod-eu-west-2.grafana.net/api/prom',
                  },
                  existingSecretName: 'metricsservice-grafana-k8s-monitoring',
                },
              },
              metricsSource: 'metricsService',
            },
            'kepler': { enabled: true },
          },
          'alloy-metrics': { enabled: true },
          'clusterEvents': { enabled: true },
          'alloy-singleton': { enabled: true },
          'podLogs': { enabled: true },
          'alloy-logs': { enabled: true },
          'applicationObservability': { enabled: false },
          'alloy-receiver': { enabled: false },
          'annotationAutodiscovery': { enabled: true },
          'prometheusOperatorObjects': {
            enabled: true,
            crds: { deploy: true },
          },
          'integrations': {
            alloy: {
              instances: [
                {
                  name: 'alloy',
                  labelSelectors: {
                    'app.kubernetes.io/name': [
                      'alloy-metrics',
                      'alloy-singleton',
                      'alloy-logs',
                      'alloy-receiver',
                    ],
                  },
                  metrics: {
                    tuning: {
                      useDefaultAllowList: true,
                      includeMetrics: ['alloy_build_info'],
                    },
                  },
                },
              ],
            },
          },
        },
      },
      { parent: this },
    );

    this.registerOutputs();
  }
}
