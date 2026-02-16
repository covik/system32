import { resources as cromanjonac } from './cromanjonac.js';
import { resources as luigitrans } from './luigitrans.js';
import { resources as zarafleet } from './zarafleet.js';
import { resources as zarapromet } from './zarapromet.js';

const all: Record<string, () => unknown> = {
  cromanjonac,
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
