import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export interface BelibrkHomePageArgs {
	cpu: pulumi.Input<string>;
	memory: pulumi.Input<string>;
}

export class BelibrkHomePage extends pulumi.ComponentResource {
	public namespaceName: pulumi.Output<string>;
	public serviceName: pulumi.Output<string>;
	public servicePort: pulumi.Output<number>;

	constructor(
		name: string,
		args: BelibrkHomePageArgs,
		opts?: pulumi.ComponentResourceOptions,
	) {
		super("fms:app:BelibrkHomePage", name, args, opts);

		const namespace = new k8s.core.v1.Namespace(
			`${name}-ns`,
			{
				metadata: { name: "belibrk-homepage" },
			},
			{ parent: this, deleteBeforeReplace: true },
		);

		const appLabels = { app: "belibrk-homepage-server" };
		const image = "nginx:stable";
		const deployment = new k8s.apps.v1.Deployment(
			`${name}-deployment`,
			{
				metadata: { namespace: namespace.metadata.name },
				spec: {
					selector: { matchLabels: appLabels },
					replicas: 1,
					template: {
						metadata: { labels: appLabels },
						spec: {
							containers: [
								{
									name: "server",
									image,
									ports: [{ containerPort: 80 }],
									resources: {
										requests: {
											cpu: args.cpu,
											memory: args.memory,
										},
										limits: {
											memory: args.memory,
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

		const service = new k8s.core.v1.Service(
			`${name}-service`,
			{
				metadata: { namespace: namespace.metadata.name },
				spec: {
					selector: deployment.spec.template.metadata.labels,
					ports: [
						{
							port: 80,
							targetPort:
								deployment.spec.template.spec.containers[0].ports[0]
									.containerPort,
						},
					],
					type: "ClusterIP",
				},
			},
			{ parent: this },
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
