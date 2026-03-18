const fs = require("node:fs");
const path = require("node:path");

function getDirectoryNames(rootDir) {
	if (!fs.existsSync(rootDir)) {
		return [];
	}

	return fs
		.readdirSync(rootDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
}

function getPackageScopes(packagesDir) {
	if (!fs.existsSync(packagesDir)) {
		return [];
	}

	const packageDirs = getDirectoryNames(packagesDir);
	const scopes = [];

	for (const packageDir of packageDirs) {
		scopes.push(packageDir);

		const packageJsonPath = path.join(packagesDir, packageDir, "package.json");
		if (!fs.existsSync(packageJsonPath)) {
			continue;
		}

		try {
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
			if (typeof packageJson.name === "string" && packageJson.name.length > 0) {
				scopes.push(packageJson.name);

				const nameSegments = packageJson.name.split("/");
				scopes.push(nameSegments[nameSegments.length - 1]);
			}
		} catch {
			// Ignore malformed package.json and fall back to directory-based scope.
		}
	}

	return scopes;
}

const workspaceRoot = __dirname;
const projectScopes = getDirectoryNames(path.join(workspaceRoot, "projects"));
const packageScopes = getPackageScopes(path.join(workspaceRoot, "packages"));

const allowedScopes = [
	"ci",
	"deps",
	"workspace", // anything applied to whole repo
	...projectScopes,
	...packageScopes,
];

const allowedActions = [
	"add",
	"build",
	"document",
	"fix",
	"improve",
	"refactor",
	"remove",
	"revert",
	"rework",
	"test",
];

module.exports = {
	extends: ["@commitlint/config-conventional"],
	parserPreset: {
		parserOpts: {
			headerPattern: /^([^:]+):\s([a-z]+)\s(.+)$/,
			headerCorrespondence: ["scope", "type", "subject"],
		},
	},
	rules: {
		"scope-enum": [2, "always", Array.from(new Set(allowedScopes)).sort()],
		"scope-empty": [2, "never"],
		"subject-empty": [2, "never"],
		"type-enum": [2, "always", allowedActions],
		"type-empty": [2, "never"],
	},
};
