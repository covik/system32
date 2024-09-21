import { resources as cromanjonac } from './cromanjonac';
import { resources as zarafleet } from './zarafleet';

const all: Record<string, () => unknown> = {
  cromanjonac,
  zarafleet,
};

export function findStackResources(stackName: string): () => unknown {
  if (!Object.prototype.hasOwnProperty.call(all, stackName)) {
    throw new Error(
      `Stack "${stackName}" has no resources imported in ${__filename}`,
    );
  }

  return all[stackName];
}
