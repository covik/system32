import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { array, assert, object, string, type } from "superstruct";
import * as yaml from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chartFilePath = path.join(__dirname, "../Chart.yaml");
const chartFileContent = fs.readFileSync(chartFilePath, "utf8");
const chartConfig = yaml.parse(chartFileContent);

const ChartSchema = type({
	dependencies: array(
		object({
			name: string(),
			version: string(),
			repository: string(),
		}),
	),
});

export interface HelmChart {
	name: string;
	repository: string;
	version: string;
}

export function findHelmDependency(name: string): HelmChart {
	assert(chartConfig, ChartSchema);
	const dependencies = chartConfig.dependencies;
	const wantedDependency = dependencies.find((dep) => dep.name === name);

	if (wantedDependency) return wantedDependency;

	throw new Error(`Dependency ${name} not found in Chart.yaml`);
}
