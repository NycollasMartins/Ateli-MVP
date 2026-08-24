import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/** Config plana do ESLint 9. O eslint-config-next 16 já exporta neste formato. */
export default [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Variável começada com _ é descarte proposital, como em (_, i) => ...
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      /**
       * Aviso, não erro.
       *
       * A regra não distingue `setState` síncrono de `setState` que acontece
       * depois de um `await`. Os carregadores de `src/lib/dados.ts` são
       * assíncronos — a primeira linha deles já é um `await` —, então ali ela
       * acusa sem haver render em cascata.
       *
       * Onde ela tem razão é nos efeitos que sincronizam estado com props
       * (o formulário do pedido que se reinicia quando muda o pedido aberto).
       * Aquilo funciona, custa um render a mais, e reescrever tem que ser feito
       * com o navegador aberto — não no escuro.
       */
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Arquivos de configuração seguem a convenção de exportar objeto anônimo.
    files: ['*.mjs', '*.ts'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },
];
