import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // WHY: logger.ts's console.info call IS the info-level implementation;
    // seed.ts is a CLI preview script where console.info is the intended output.
    files: ['src/lib/logger.ts', 'src/seed.ts'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    // WHY: plain .mjs build/dev scripts run directly under Node, outside tsc's
    // @types/node coverage — declare the Node globals they use so `no-undef`
    // doesn't flag console/process/etc. as undefined.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly' },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'drizzle/', 'coverage/', 'src/generated/', 'idor-test.mjs'],
  },
);
