import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
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
      // Regra do React Compiler. Sinaliza qualquer função que chegue a setState
      // a partir de um efeito, incluindo "buscar dados ao montar" — padrão usado
      // em três telas deste projeto (NotificationBell, useOlheiro e Rankings).
      // Satisfazê-la exigiria TanStack Query ou similar. Medido em 30/08/2026:
      // separar busca de estado não resolve, um finally com setCarregando já
      // dispara. O único caso legítimo que a regra pegava — o isDirty do Painel
      // Admin, que era estado derivado e não busca — foi corrigido antes de
      // desligar. Reativar se o projeto adotar uma biblioteca de data fetching.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
