import { resources as cromanjonac } from "./cromanjonac.js";

const all: Record<string, () => unknown> = {
	cromanjonac,
};

export function findStackResources(stackName: string): () => unknown {
	if (!Object.hasOwn(all, stackName)) {
		throw new Error(
			`Stack "${stackName}" has no resources imported in ${__filename}`,
		);
	}

	return all[stackName];
}
