import js from '@eslint/js';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

// eslint-disable-next-line import/no-default-export
export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/kubeconfig.yml'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'import': importPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      // Common rules (non-TypeScript specific)
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
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.eslint.json',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
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
      '@typescript-eslint/consistent-type-definitions': 'off', // Not sure what's wrong with both 'type' and 'interface'
      '@typescript-eslint/no-extraneous-class': 'off', // It's all bells and whistles until you want to spy or mock in tests
      '@typescript-eslint/no-invalid-void-type': [
        'error',
        { allowInGenericTypeArguments: true, allowAsThisParameter: true },
      ],
    },
  },
  {
    files: ['*.d.ts'],
    rules: {
      '@typescript-eslint/method-signature-style': 'off', // If you augment native libs you must use the same style
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['*'],
    rules: prettierConfig.rules,
  },
  {
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts'],
      },
      'import/resolver': {
        node: true,
        typescript: {
          alwaysTryTypes: true, // Always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
          project: './tsconfig.json',
        },
      },
    },
  },
];
