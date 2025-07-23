import { resources as cromanjonac } from './cromanjonac';
import { resources as grafana } from './grafana-cloud';
import { resources as luigitrans } from './luigitrans';
import { resources as zarafleet } from './zarafleet';
import { resources as zarapromet } from './zarapromet';

const all: Record<string, () => unknown> = {
  cromanjonac,
  grafana,
  luigitrans,
  zarafleet,
  zarapromet,
};

export function findStackResources(stackName: string): () => unknown {
  if (!Object.prototype.hasOwnProperty.call(all, stackName)) {
    throw new Error(
      `Stack "${stackName}" has no resources imported in ${__filename}`,
    );
  }

  return all[stackName];
}
