import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  stylistic: {
    indent: 2,
    quotes: 'single',
    overrides: {
      "n/prefer-global/buffer": ["error", "always"],
      "no-console": "off",
      "unused-imports/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
  typescript: true,
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
  ],
})
