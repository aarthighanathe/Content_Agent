import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // WHY: vitest coverage HTML under coverage/ is generated output — linting it
  // only adds noise (and can fail CI) after a local `npm run test:coverage`.
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // WHY: underscore-prefixed identifiers are the TypeScript/JavaScript convention for
      // "intentionally unused" — used in destructured prop contracts where the prop is part
      // of a stable interface but not read in the current body. Without this pattern, the
      // rule flags every `_content`, `_jobId`, `_social` etc. despite the intent being
      // explicit. The argsIgnorePattern only ignores args; varsIgnorePattern covers
      // destructured variables (the common case in this codebase).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // WHY warn not error: react-hooks/set-state-in-effect fires on legitimate patterns —
      // loading data in an effect (the canonical React data-fetching pattern), syncing
      // derived state from props on mount, and resetting state when a dependency changes
      // are all cases this codebase uses correctly with proper cleanup. The rule is
      // opinionated about a trade-off (cascade renders vs. required imperative patterns)
      // that React's own docs explicitly allow. Keeping it as a warning rather than 0 still
      // surfaces accidental misuse while not blocking builds for deliberate usages.
      'react-hooks/set-state-in-effect': 'warn',
      // WHY warn not error: eslint-plugin-react-hooks@7 treats reading
      // `ref.current` during render as an error, but this app uses that pattern
      // deliberately for race-safe "live id" / mount / account-scope checks
      // (Result, Create, Batch, Brand, Repurpose). Demoting keeps the signal
      // without blocking CI the way set-state-in-effect already does.
      'react-hooks/refs': 'warn',
      // WHY warn not error: same plugin release flags assigning
      // `someRef.current = fn` (refreshFamilyRef, etc.) as immutability errors;
      // those writes are intentional and happen outside JSX render output.
      'react-hooks/immutability': 'warn',
      // WHY warn not error: react-refresh/only-export-components fires on files that mix
      // component exports with non-component exports (types, constants, utility functions).
      // IGSlide.tsx re-exports SlideData/SlidePoint types alongside the component as the
      // stable public entry-point for the carousel subsystem — changing that would require
      // updating every importer. Hook files (useJobData, useMultiplier, etc.) are not
      // component files and Fast Refresh doesn't apply to them anyway.
      'react-refresh/only-export-components': 'warn',
      // WHY allowEmptyCatch: the project uses `catch { /* non-fatal */ }` (empty body with
      // a comment) throughout for intentionally swallowed errors. ESLint's no-empty rule
      // by default treats any empty block as an error even when it has a comment; this
      // option corrects that to match the intended convention.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
])
