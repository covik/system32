import * as pulumi from '@pulumi/pulumi';
import { DockerCredentials } from './DockerCredentials';

export function createContainerRegistryCredentials(
  registryConfig: pulumi.Config,
): pulumi.Output<DockerCredentials> {
  return pulumi
    .all([
      registryConfig.require('container-registry-url'),
      registryConfig.require('container-registry-user'),
      registryConfig.requireSecret('container-registry-token'),
    ])
    .apply(([url, user, password]) =>
      DockerCredentials.forRegistry(url).asUser(user).withPassword(password),
    );
}

export function resolveRegistryImage(
  tag: pulumi.Input<string>,
  registryConfig: pulumi.Config,
): pulumi.Output<string> {
  return pulumi.interpolate`${registryConfig.require(
    'container-registry-url',
  )}/${registryConfig.require('container-registry-user')}/${tag}`;
}
