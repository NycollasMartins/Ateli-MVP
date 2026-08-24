'use client';

import { useState } from 'react';
import { useJanelaModal } from '@/lib/janela';
import { moeda } from '@/lib/formato';
import { ACRESCIMO_PRESSA_CENTAVOS, type UrgentePerfil } from '@/lib/tipos';

/**
 * A pergunta que aparece ao marcar "preciso com pressa".
 *
 * Ministro, ministra e advogado têm a pressa sem pagar por ela. Quem não é
 * precisa **saber do acréscimo antes de aceitar**, não descobrir na retirada:
 * por isso o valor aparece escrito, em dois passos, e sair sem aceitar
 * desmarca a opção em vez de deixá-la marcada em silêncio.
 */
export function PerguntaDaPressa({
  aoResponder,
  aoDesistir,
}: {
  aoResponder: (perfil: UrgentePerfil) => void;
  aoDesistir: () => void;
}) {
  const [verAcrescimo, setVerAcrescimo] = useState(false);
  const janela = useJanelaModal<HTMLDivElement>(true, aoDesistir);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button className="absolute inset-0 bg-mata-escuro/40" onClick={aoDesistir} aria-label="Fechar" />
      <div
        ref={janela}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-pressa"
        tabIndex={-1}
        className="papel-molde relative w-full max-w-md border border-grade p-6 outline-none sm:m-5"
      >
        {!verAcrescimo ? (
          <>
            <p className="rotulo">Preciso com pressa</p>
            <h2 id="titulo-pressa" className="mt-1.5 font-display text-2xl leading-tight">
              Você é ministro, ministra ou advogado?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-tinta-suave">
              Quem é tem a prioridade sem pagar nada a mais por ela.
            </p>

            <div className="mt-6 space-y-2.5">
              <button type="button" onClick={() => aoResponder('ministro')} className="btn btn-principal w-full">
                Sou ministro ou ministra
              </button>
              <button type="button" onClick={() => aoResponder('advogado')} className="btn btn-principal w-full">
                Sou advogado ou advogada
              </button>
              <button type="button" onClick={() => setVerAcrescimo(true)} className="btn btn-secundario w-full">
                Não sou nenhum dos dois
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="rotulo">Preciso com pressa</p>
            <h2 id="titulo-pressa" className="mt-1.5 font-display text-2xl leading-tight">
              A prioridade custa <span className="num">{moeda(ACRESCIMO_PRESSA_CENTAVOS)}</span> a mais
            </h2>
            <p className="mt-3 text-sm leading-relaxed">
              O valor entra no total do seu pedido e você paga na retirada, junto com o resto.
            </p>

            <div className="mt-6 space-y-2.5">
              <button type="button" onClick={() => aoResponder('outro')} className="btn btn-principal w-full">
                Entendi, quero com pressa
              </button>
              <button type="button" onClick={aoDesistir} className="btn btn-secundario w-full">
                Deixa para lá, pode ser no prazo normal
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
