module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'workspace', // anything applied to whole repo
        'deps',
        'tooling',
        'utils',
        'production',
        'local',
        'test',
      ],
    ],
  },
};
