/* eslint-disable no-new */
import * as docker from '@pulumi/docker';

const hostProjectRoot = process.env['HOST_PROJECT_ROOT'] as string;

const frontend = {
  containerName: 'fms-frontend',
  command: 'yarn dev:frontend',
};

const traccar = {
  containerName: 'fms-traccar',
  version: 4.15,
};

export function resources(): void {
  const network = new docker.Network('fms-local-network', {
    attachable: true,
    checkDuplicate: true,
  });

  new docker.Container('frontend', {
    image: 'fms-local:latest',
    command: frontend.command.split(' '),
    hostname: frontend.containerName,
    name: frontend.containerName,
    networksAdvanced: [{ name: network.name }],
    ports: [
      {
        external: 8081,
        internal: 8080,
      },
    ],
    volumes: [
      {
        containerPath: '/src',
        hostPath: hostProjectRoot,
      },
    ],
  });

  new docker.Container('traccar', {
    image: `traccar/traccar:${traccar.version}-alpine`,
    hostname: traccar.containerName,
    name: traccar.containerName,
    networksAdvanced: [{ name: network.name }],
    ports: [
      {
        external: 8082,
        internal: 8082,
      },
    ],
    volumes: [
      {
        containerPath: '/opt/traccar/data',
        hostPath: `${hostProjectRoot}tmp/Traccar`,
      },
    ],
  });
}
