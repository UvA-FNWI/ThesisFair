module.exports = {
  root: true,
  env: { browser: true, es2024: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  plugins: ['react-refresh'],
  parserOptions: {
    ecmaFeatures: {
      modules: true,
      spread: true,
      restParams: true,
      jsx: true,
    },
    extraFileExtensions: ['.scss'],
  },

  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react/prop-types': 'off',
    'no-unused-vars': 'error',
    quotes: [
      'error',
      'single',
      {
        avoidEscape: true,
      },
    ],
    semi: ['error', 'never'],
  },
  overrides: [
    {
      files: ['*.@(js|jsx|mjs|cjs)'],
      parserOptions: {
        sourceType: 'module',
      },
    },
    {
      files: ['*.@(ts|tsx|mts|cts|js|jsx|mjs|cjs)'],
      plugins: ['simple-import-sort', 'sort-destructure-keys', 'import'],
      rules: {
        'array-element-newline': ['error', 'consistent'],
        'class-methods-use-this': 'off',
        'consistent-return': 'off',
        'import/extensions': 'off',
        'import/first': 'error',
        'import/newline-after-import': 'error',
        'import/no-duplicates': 'error',
        'import/no-extraneous-dependencies': 'off',
        'import/prefer-default-export': 'off',
        'linebreak-style': ['error', 'unix'],
        'no-await-in-loop': 'off',
        'no-console': 'off',
        'no-dupe-keys': 'error',
        'no-duplicate-case': 'error',
        'no-restricted-globals': 'warn',
        'no-restricted-syntax': 'off',
        'no-unused-vars': ['error', { varsIgnorePattern: '^h$|^React$' }],
        'simple-import-sort/exports': 'error',
        'simple-import-sort/imports': [
          'error',
          {
            groups: [
              // Node.js builtins.
              [
                '^(assert|buffer|child_process|cluster|console|constants|crypto|dgram|dns|domain|events|fs|http|https|module|net|os|path|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|tty|url|util|vm|zlib|freelist|v8|process|async_hooks|http2|perf_hooks)(/.*|$)',
              ],
              // Side effect imports.
              ['^\\u0000'],
              // Node.js builtins prefixed with `node:`.
              ['^node:'],
              ['^.*\\u0000$'],
              // Packages.
              // Things that start with a letter (or digit or underscore), or `@` followed by a letter.
              ['^@?\\w'],
              // Absolute imports and other imports such as Vue-style `@/foo`.
              // Anything not matched in another group.
              ['^'],
              // Relative imports.
              // Anything that starts with a dot.
              // Further away to closest
              ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
              ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
              // Style imports.
              ['^.+\\.s?css$'],
            ],
          },
        ],
        'sort-destructure-keys/sort-destructure-keys': 'error',
      },
    },

    {
      files: ['*.@(json|json5|jsonc)'],
      parser: 'jsonc-eslint-parser',
      extends: [
        'plugin:jsonc/base',
        'plugin:jsonc/recommended-with-json',
        'plugin:jsonc/recommended-with-jsonc',
        'plugin:jsonc/recommended-with-json5',
        'plugin:jsonc/prettier',
      ],
      rules: {
        'jsonc/auto': 'error',
      },
    },
  ],
}
