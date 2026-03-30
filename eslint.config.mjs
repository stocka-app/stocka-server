// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**', 'test/**/*.js'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // TypeScript strict rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/unbound-method': 'warn',

      // Acronyms must be fully uppercased (UUID, CQRS, IPv4, IPv6, VO, etc.)
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: null,
          custom: {
            regex: 'Uuid|Cqrs|Ipv[46]',
            match: false,
          },
        },
      ],

      // One class per file (relaxed for DTOs, VOs, errors, adapters via overrides below)
      'max-classes-per-file': ['error', 1],

      // Prettier
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  // Relaxed rules for test files
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'max-classes-per-file': 'off',
    },
  },
  // Relaxed max-classes for DTOs, VOs, domain errors, and adapters (colocated by design)
  {
    files: [
      'src/**/*.dto.ts',
      'src/**/*.vo.ts',
      'src/**/value-objects/**/*.ts',
      'src/**/*-errors.ts',
      'src/**/*-error.ts',
      'src/**/*.adapter.ts',
    ],
    rules: {
      'max-classes-per-file': 'off',
    },
  },
  // Relaxed rules for email templates (TSX — inline i18n arrow fns)
  {
    files: ['src/**/email/templates/**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  // Restrict relative imports in all files
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['../*', './*'],
        },
      ],
    },
  },
  // Prohibit definite assignment assertion (!:) except in DTOs, entities, and env validation
  {
    files: ['src/**/*.ts'],
    ignores: [
      'src/**/*.dto.ts',
      'src/**/*.entity.ts',
      'src/**/env.validation.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'PropertyDefinition[definite=true]',
          message:
            'Definite assignment assertion (!:) is only allowed in DTOs, entities, and env validation. Initialize the property in the constructor or use `| undefined` with a runtime guard.',
        },
      ],
    },
  },
  // Enforce one HTTP operation (use case) per controller
  {
    files: ['src/**/*.controller.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ClassBody:has(MethodDefinition:has(Decorator > CallExpression[callee.name=/^(Get|Post|Put|Patch|Delete|Options|Head|All)$/]) ~ MethodDefinition:has(Decorator > CallExpression[callee.name=/^(Get|Post|Put|Patch|Delete|Options|Head|All)$/]))',
          message:
            'A controller can only expose one HTTP operation (one use case). Split additional endpoints into separate controllers.',
        },
      ],
    },
  }
);
