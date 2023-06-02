import * as pulumi from '@pulumi/pulumi';

export interface DatabaseConnection {
  host: pulumi.Input<string>;
  port: pulumi.Input<number>;
  database: pulumi.Input<string>;
  flags: Record<string, string>;
}

export function createMysqlConnectionString({
  host,
  port,
  database,
  flags,
}: DatabaseConnection): pulumi.Output<string> {
  const flagsAsString = flagsToString(flags);

  return pulumi
    .all([host, port, database])
    .apply(([_host, _port, _database]) => {
      return `jdbc:mysql://${_host}:${_port}/${_database}${flagsAsString}`;
    });
}

function flagsToString(flags: DatabaseConnection['flags']): string {
  const keyValueArray = Object.entries(flags);
  if (keyValueArray.length === 0) return '';

  const keyValueString = keyValueArray.map(([key, value]) => `${key}=${value}`);
  return `?${keyValueString.join('&amp;')}`;
}
