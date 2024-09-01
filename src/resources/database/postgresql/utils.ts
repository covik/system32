import * as pulumi from '@pulumi/pulumi';

export function createConnectionString({
  host,
  port,
  username,
  password,
  database,
}: {
  host: pulumi.Input<string>;
  port: pulumi.Input<number>;
  username: pulumi.Input<string>;
  password: pulumi.Input<string>;
  database: pulumi.Input<string>;
}): pulumi.Output<string> {
  return pulumi.interpolate`postgres://${username}:${password}@${host}:${port}/${database}?sslmode=require`;
}
