'use client';

/**
 * Última rede: erro que acontece fora do painel, inclusive no layout raiz.
 *
 * Precisa trazer <html> e <body> próprios, porque substitui o layout inteiro.
 * Por isso não pode contar com o Tailwind nem com as variáveis da marca.
 *
 * cor-fixa: as cores abaixo são literais de propósito — é a única forma de
 * garantir que esta tela apareça legível quando o resto não carregou.
 */
const COR = {
  fundo: '#F2F3EE',
  papel: '#FBFBF7',
  texto: '#14201B',
  grade: '#DCE3E9',
  base: '#26362E',
};

export default function ErroGeral({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          background: COR.fundo,
          color: COR.texto,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            margin: '15vh auto',
            padding: '2rem',
            background: COR.papel,
            border: `1px solid ${COR.grade}`,
          }}
        >
          <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Alguma coisa quebrou</h1>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
            Nada foi perdido. Tente abrir de novo; se continuar, feche e abra o site outra vez.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${COR.base}`,
              background: COR.base,
              color: COR.papel,
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
