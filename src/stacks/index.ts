import { resources as production } from './production';
import { resources as staging } from './staging';

const all: Record<string, () => unknown> = {
  production,
  staging,
};

export function findStackResources(stackName: string): () => unknown {
  if (!Object.prototype.hasOwnProperty.call(all, stackName)) {
    throw new Error(
      `Stack "${stackName}" has no resources imported in ${__filename}`,
    );
  }

  return all[stackName];
}
