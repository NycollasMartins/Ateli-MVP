'use client';

import { useEffect } from 'react';

/**
 * Rede embaixo do painel inteiro.
 *
 * Sem isto, qualquer erro de tela vira a página de erro do Next — em inglês,
 * sem explicação e sem saída. Aqui ela lê o que aconteceu, tem um botão para
 * tentar de novo e sabe que os dados dela não se perderam.
 */
export default function ErroDoPainel({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ateliê] erro na tela do painel:', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="cartao w-full max-w-md p-8">
        <p className="rotulo">Alguma coisa quebrou</p>
        <h1 className="mt-2 font-display text-2xl leading-tight">Esta tela não abriu</h1>

        <p className="mt-3 text-sm leading-relaxed">
          Nenhum pedido, foto ou valor foi perdido — o problema é só na hora de mostrar. Tente
          abrir de novo; se continuar, saia e entre outra vez no painel.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={reset} className="btn btn-principal">
            Tentar de novo
          </button>
          <a href="/painel" className="btn btn-secundario">
            Voltar para a visão geral
          </a>
        </div>

        {error.digest && (
          <p className="num mt-6 text-[11px] text-tinta-suave">
            Código do erro: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
