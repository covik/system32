import { resources as local } from './local';
import { resources as production } from './production';

const all: Record<string, () => unknown> = {
  production,
  local,
};

export function findStackResources(stackName: string): () => unknown {
  if (!Object.prototype.hasOwnProperty.call(all, stackName)) {
    throw new Error(
      `Stack "${stackName}" has no resources imported in ${__filename}`,
    );
  }

  return all[stackName];
}
