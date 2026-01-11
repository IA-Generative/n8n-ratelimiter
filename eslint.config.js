import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  stylistic: {
    indent: 2,
    quotes: 'single',
    overrides: {
      "n/prefer-global/buffer": ["error", "always"],
      "no-console": "off",
    },
  },
  typescript: true,
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
  ],
})
