import * as cloudflare from "@pulumi/cloudflare";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export interface ZaraPrometHomePageArgs {
	cpu: pulumi.Input<string>;
	memory: pulumi.Input<string>;
}

export class ZaraPrometHomePage extends pulumi.ComponentResource {
	public namespaceName: pulumi.Output<string>;
	public serviceName: pulumi.Output<string>;
	public servicePort: pulumi.Output<number>;

	constructor(
		name: string,
		args: ZaraPrometHomePageArgs,
		opts?: pulumi.ComponentResourceOptions,
	) {
		super("fms:app:ZaraPrometHomePage", name, args, opts);
		const hostname = "zarapromet.hr";

		const dnsZone = cloudflare.Zone.get(
			hostname,
			"5be21630023716ba935edeb19f232538",
			{},
		);

		new cloudflare.DnsRecord("cname-to-zth.dev", {
			zoneId: dnsZone.id,
			name: `next.${hostname}`,
			type: "CNAME",
			content: "zth.dev",
			ttl: 1800,
		});

		const namespace = new k8s.core.v1.Namespace(
			`${name}-ns`,
			{
				metadata: { name: "zarapromet-homepage" },
			},
			{ parent: this, deleteBeforeReplace: true },
		);

		const appLabels = { app: "zarapromet-homepage-server" };
		const image =
			"ghcr.io/covik/zarapromet.hr@sha256:f716d97057806ed903f2a26cc79749bb86ff0f26f9c7fad24b75c7398a965891";
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
