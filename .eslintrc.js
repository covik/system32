module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  env: {
    node: true,
  },
  plugins: ['@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.eslint.json',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Following base ESLint rules do not understand types.
    // They are replaced with version from @typescript-eslint
    'no-undef': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    'no-useless-constructor': 'off',
    '@typescript-eslint/no-useless-constructor': 'error',
    'no-empty-function': 'off',
    '@typescript-eslint/no-empty-function': [
      'error',
      { allow: ['private-constructors'] },
    ],

    '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/consistent-type-assertions': [
      'error',
      { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
    ],
    '@typescript-eslint/consistent-type-definitions': 'off', // not sure what's wrong with both 'type' and 'interface'
    '@typescript-eslint/no-extraneous-class': 'off', // it's all bells and whistles until you want to spy or mock in tests
    '@typescript-eslint/no-invalid-void-type': [
      'error',
      { allowInGenericTypeArguments: true, allowAsThisParameter: true },
    ],

    'import/no-unresolved': 'error',
    'import/no-default-export': 'error',
    'import/order': [
      'error',
      {
        'newlines-between': 'never',
        'groups': [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'type',
        ],
        'alphabetize': {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    'prefer-promise-reject-errors': 'error',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-void': 'off',
  },
  overrides: [
    {
      files: '*.d.ts',
      rules: {
        '@typescript-eslint/method-signature-style': 'off', // if you augment native libs you must use the same style
        'import/no-default-export': 'off',
      },
    },
  ],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts'],
    },
    'import/resolver': {
      node: true,
      typescript: {
        alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
        project: 'tsconfig.json',
      },
    },
  },
};
