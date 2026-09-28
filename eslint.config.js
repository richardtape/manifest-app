import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      // VENDORED FROM MANIFEST AND NEVER EDITED (Decision 2).
      'packages/ui/reference/**',
      '.superpowers/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    // DECISION 3: only src/platform/ calls the platform. This is the lint half; the TEST
    // in packages/web/src/boundary.test.ts is the other, and each is watched failing.
    // Anyone may import the contract's TYPES (`allowTypeImports`).
    files: ['packages/web/src/**/*.ts', 'packages/web/src/**/*.tsx'],
    ignores: [
      'packages/web/src/platform/**',
      'packages/web/src/**/*.test.ts',
      'packages/web/src/**/*.test.tsx',
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@manifest/contract',
              allowTypeImports: true,
              message:
                'Only src/platform/ calls the platform (Decision 3). Import its types with `import type`.',
            },
          ],
          patterns: [
            {
              regex: '/manifest/|^(\\.\\./){3}',
              message:
                'web imports nothing from the manifest repository except @manifest/contract (Decision 3).',
            },
          ],
        },
      ],
    },
  },
)
