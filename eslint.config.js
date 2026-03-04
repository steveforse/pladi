import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import vitest from '@vitest/eslint-plugin'
import testingLibrary from 'eslint-plugin-testing-library'
import jestDom from 'eslint-plugin-jest-dom'

export default tseslint.config(
  { ignores: ['public/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['app/javascript/**/*.test.ts', 'app/javascript/**/*.test.tsx', 'app/javascript/**/__tests__/**/*.ts', 'app/javascript/**/__tests__/**/*.tsx', 'app/javascript/test/**/*.ts'],
    languageOptions: vitest.configs.env.languageOptions,
    plugins: {
      vitest,
      'testing-library': testingLibrary,
      'jest-dom': jestDom,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      ...testingLibrary.configs['flat/react'].rules,
      ...jestDom.configs['flat/recommended'].rules,
    },
  },
)
