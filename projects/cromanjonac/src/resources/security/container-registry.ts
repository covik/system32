import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export interface ContainerRegistryCredentials {
	url: pulumi.Input<string>;
	username: pulumi.Input<string>;
	password: pulumi.Input<string>;
}

export function RegistrySecret(
	name: string,
	args: {
		namespace: k8s.core.v1.Namespace;
		credentials: ContainerRegistryCredentials;
	},
	resourceOptions: pulumi.ResourceOptions,
): k8s.core.v1.Secret {
	const dockerconfigjson = pulumi
		.all([
			args.credentials.url,
			args.credentials.username,
			args.credentials.password,
		])
		.apply(([url, username, password]) =>
			Buffer.from(
				JSON.stringify({
					auths: {
						[url]: {
							auth: Buffer.from(`${username}:${password}`, "utf-8").toString(
								"base64",
							),
						},
					},
				}),
			).toString("base64"),
		);

	return new k8s.core.v1.Secret(
		name,
		{
			metadata: {
				namespace: args.namespace.metadata.name,
			},
			type: "kubernetes.io/dockerconfigjson",
			data: {
				".dockerconfigjson": dockerconfigjson,
			},
		},
		resourceOptions,
	);
}

export function resolveRegistryImage(args: {
	url: pulumi.Input<string>;
	repository: pulumi.Input<string>;
	tag?: pulumi.Input<string> | undefined;
	digest?: pulumi.Input<string> | undefined;
}): pulumi.Output<string> {
	return pulumi
		.all([args.url, args.repository, args.tag, args.digest])
		.apply(([url, repository, tag, digest]) => {
			let image = `${url}/${repository}`;
			if (tag) {
				image += `:${tag}`;
			}
			if (digest) {
				image += `@${digest}`;
			}
			return image;
		});
}
