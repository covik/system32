import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { findHelmDependency } from "../../utils/index.js";

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
		super("fms:monitoring:GrafanaAlloy", name, args, opts);

		const namespace = new k8s.core.v1.Namespace(
			`${name}-ns`,
			{
				metadata: { name: "grafana-alloy-system" },
			},
			{ parent: this },
		);

		const alloyCrdChartSettings = findHelmDependency("alloy-crd");
		const alloyCrdRelease = new k8s.helm.v3.Release(
			`${name}-alloy-crd-release`,
			{
				name: `${name}-alloy-crd`,
				atomic: true,
				chart: alloyCrdChartSettings.name,
				version: alloyCrdChartSettings.version,
				namespace: namespace.metadata.name,
				repositoryOpts: {
					repo: alloyCrdChartSettings.repository,
				},
			},
			{ parent: this },
		);

		const chartSettings = findHelmDependency("k8s-monitoring");
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
					cluster: {
						name: args.clusterName,
					},
					destinations: [
						{
							name: "grafana-cloud-metrics",
							type: "prometheus",
							url: "https://prometheus-prod-24-prod-eu-west-2.grafana.net./api/prom/push",
							auth: {
								type: "basic",
								username: "1732483",
								password: args.cloudAccessPolicyToken,
							},
						},
						{
							name: "grafana-cloud-logs",
							type: "loki",
							url: "https://logs-prod-012.grafana.net./loki/api/v1/push",
							auth: {
								type: "basic",
								username: "965971",
								password: args.cloudAccessPolicyToken,
							},
						},
						{
							name: "gc-otlp-endpoint",
							type: "otlp",
							url: "https://otlp-gateway-prod-eu-west-2.grafana.net./otlp",
							protocol: "http",
							auth: {
								type: "basic",
								username: "1008191",
								password: args.cloudAccessPolicyToken,
							},
							metrics: {
								enabled: true,
							},
							logs: {
								enabled: true,
							},
							traces: {
								enabled: true,
							},
						},
					],
					clusterMetrics: {
						enabled: true,
						opencost: {
							enabled: true,
							metricsSource: "grafana-cloud-metrics",
							opencost: {
								exporter: {
									defaultClusterId: args.clusterName,
								},
								prometheus: {
									existingSecretName:
										"grafana-cloud-metrics-monitoring-k8s-monitoring",
									external: {
										url: "https://prometheus-prod-24-prod-eu-west-2.grafana.net./api/prom",
									},
								},
							},
						},
						kepler: {
							enabled: true,
						},
					},
					clusterEvents: { enabled: true },
					nodeLogs: { enabled: true },
					podLogs: { enabled: true },
					annotationAutodiscovery: { enabled: true },
					prometheusOperatorObjects: {
						enabled: true,
					},
					applicationObservability: {
						enabled: true,
						receivers: {
							otlp: {
								grpc: {
									enabled: true,
									port: 4317,
								},
								http: {
									enabled: true,
									port: 4318,
								},
							},
							zipkin: {
								enabled: true,
								port: 9411,
							},
						},
					},
					"alloy-metrics": {
						enabled: true,
						alloy: {
							extraEnv: [
								{
									name: "GCLOUD_RW_API_KEY",
									valueFrom: {
										secretKeyRef: {
											name: "alloy-metrics-remote-cfg-grafana-k8s-monitoring",
											key: "password",
										},
									},
								},
								{
									name: "CLUSTER_NAME",
									value: args.clusterName,
								},
								{
									name: "NAMESPACE",
									valueFrom: {
										fieldRef: {
											fieldPath: "metadata.namespace",
										},
									},
								},
								{
									name: "POD_NAME",
									valueFrom: {
										fieldRef: {
											fieldPath: "metadata.name",
										},
									},
								},
								{
									name: "GCLOUD_FM_COLLECTOR_ID",
									value:
										"grafana-k8s-monitoring-$(CLUSTER_NAME)-$(NAMESPACE)-$(POD_NAME)",
								},
							],
						},
					},
					"alloy-singleton": {
						enabled: true,
						alloy: {
							extraEnv: [
								{
									name: "GCLOUD_RW_API_KEY",
									valueFrom: {
										secretKeyRef: {
											name: "alloy-singleton-remote-cfg-grafana-k8s-monitoring",
											key: "password",
										},
									},
								},
								{
									name: "CLUSTER_NAME",
									value: args.clusterName,
								},
								{
									name: "NAMESPACE",
									valueFrom: {
										fieldRef: {
											fieldPath: "metadata.namespace",
										},
									},
								},
								{
									name: "POD_NAME",
									valueFrom: {
										fieldRef: {
											fieldPath: "metadata.name",
										},
									},
								},
								{
									name: "GCLOUD_FM_COLLECTOR_ID",
									value:
										"grafana-k8s-monitoring-$(CLUSTER_NAME)-$(NAMESPACE)-$(POD_NAME)",
								},
							],
						},
						remoteConfig: {
							enabled: true,
							url: "https://fleet-management-prod-011.grafana.net",
							auth: {
								type: "basic",
								username: "1008191",
								password: args.cloudAccessPolicyToken,
							},
						},
					},
					"alloy-logs": {
						enabled: true,
						alloy: {
							extraEnv: [
								{
									name: "GCLOUD_RW_API_KEY",
									valueFrom: {
										secretKeyRef: {
											name: "alloy-logs-remote-cfg-grafana-k8s-monitoring",
											key: "password",
										},
									},
								},
								{
									name: "CLUSTER_NAME",
									value: args.clusterName,
								},
								{
									name: "NAMESPACE",
									valueFrom: {
										fieldRef: {
											fieldPath: "metadata.namespace",
										},
									},
								},
								{
									name: "POD_NAME",
									valueFrom: {
										fieldRef: {
											fieldPath: "metadata.name",
										},
									},
								},
								{
									name: "NODE_NAME",
									valueFrom: {
										fieldRef: {
											fieldPath: "spec.nodeName",
										},
									},
								},
								{
									name: "GCLOUD_FM_COLLECTOR_ID",
									value:
										"grafana-k8s-monitoring-$(CLUSTER_NAME)-$(NAMESPACE)-alloy-logs-$(NODE_NAME)",
								},
							],
						},
						remoteConfig: {
							enabled: true,
							url: "https://fleet-management-prod-011.grafana.net",
							auth: {
								type: "basic",
								username: "1008191",
								password: args.cloudAccessPolicyToken,
							},
						},
					},
					"alloy-receiver": {
						enabled: true,
						alloy: {
							extraPorts: [
								{
									name: "otlp-grpc",
									port: 4317,
									targetPort: 4317,
									protocol: "TCP",
								},
								{
									name: "otlp-http",
									port: 4318,
									targetPort: 4318,
									protocol: "TCP",
								},
								{
									name: "zipkin",
									port: 9411,
									targetPort: 9411,
									protocol: "TCP",
								},
							],
							extraEnv: [
								{
									name: "GCLOUD_RW_API_KEY",
									valueFrom: {
										secretKeyRef: {
											name: "alloy-receiver-remote-cfg-grafana-k8s-monitoring",
											key: "password",
										},
									},
								},
								{
									name: "CLUSTER_NAME",
									value: args.clusterName,
								},
								{
									name: "NAMESPACE",
									valueFrom: {
										fieldRef: {
											fieldPath: "metadata.namespace",
										},
									},
								},
								{
									name: "POD_NAME",
									valueFrom: {
										fieldRef: {
											fieldPath: "metadata.name",
										},
									},
								},
								{
									name: "NODE_NAME",
									valueFrom: {
										fieldRef: {
											fieldPath: "spec.nodeName",
										},
									},
								},
								{
									name: "GCLOUD_FM_COLLECTOR_ID",
									value:
										"grafana-k8s-monitoring-$(CLUSTER_NAME)-$(NAMESPACE)-alloy-receiver-$(NODE_NAME)",
								},
							],
						},
						remoteConfig: {
							enabled: true,
							url: "https://fleet-management-prod-011.grafana.net",
							auth: {
								type: "basic",
								username: "1008191",
								password: args.cloudAccessPolicyToken,
							},
						},
					},
				},
			},
			{ parent: this, dependsOn: [alloyCrdRelease] },
		);

		this.registerOutputs();
	}
}
