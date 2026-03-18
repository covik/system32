const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = __dirname;
const projectScopes = getDirectoryNames(path.join(workspaceRoot, "projects"));
const packageScopes = getDirectoryNames(path.join(workspaceRoot, "packages"));

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

function getDirectoryNames(rootDir) {
	if (!fs.existsSync(rootDir)) {
		return [];
	}

	return fs
		.readdirSync(rootDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
}
