import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // As quatro famílias abaixo são a marca: vêm de variáveis CSS para o
        // ateliê poder trocá-las no painel. Os canais ficam soltos ("38 54 46")
        // porque é assim que o /50 de opacidade do Tailwind continua funcionando.
        mata: {
          DEFAULT: 'rgb(var(--cor-mata) / <alpha-value>)',
          claro: 'rgb(var(--cor-mata-claro) / <alpha-value>)',
          escuro: 'rgb(var(--cor-mata-escuro) / <alpha-value>)',
        },
        giz: {
          DEFAULT: 'rgb(var(--cor-giz) / <alpha-value>)',
          claro: 'rgb(var(--cor-giz-claro) / <alpha-value>)',
        },
        fita: {
          DEFAULT: 'rgb(var(--cor-fita) / <alpha-value>)',
          escura: 'rgb(var(--cor-fita-escura) / <alpha-value>)',
        },
        linha: {
          DEFAULT: 'rgb(var(--cor-linha) / <alpha-value>)',
          clara: 'rgb(var(--cor-linha-clara) / <alpha-value>)',
        },
        // Papel, grade e tinta são o substrato do desenho e não mudam de
        // ateliê para ateliê: mexer neles quebra o contraste da tela.
        papel: { DEFAULT: '#FBFBF7', fundo: '#F2F3EE' },
        grade: '#DCE3E9',
        tinta: { DEFAULT: '#14201B', suave: '#5C6862' },
      },
      fontFamily: {
        display: ['var(--fonte-display)', 'Georgia', 'serif'],
        sans: ['var(--fonte-corpo)', 'system-ui', 'sans-serif'],
        mono: ['var(--fonte-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { DEFAULT: '2px', md: '3px', lg: '4px' },
      fontSize: {
        eyebrow: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.14em' }],
      },
    },
  },
  plugins: [],
} satisfies Config;
