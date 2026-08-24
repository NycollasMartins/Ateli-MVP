'use client';

import { useCallback, useEffect, useState } from 'react';
import { irParaLogin } from '@/lib/dados';
import { contar, resumoDaSaude, type Checagem, type Situacao } from '@/lib/saude';
import { Cabecalho } from '@/components/Cabecalho';
import { Cartao, Rotulo } from '@/components/ui';

const CORES: Record<Situacao, string> = {
  ok: 'text-tinta-suave',
  atencao: 'text-fita-escura',
  falta: 'text-linha',
};

/** Rótulo curto no lugar de símbolo: é o vocabulário que o resto do painel usa,
 *  e se lê sozinho no leitor de tela, sem precisar de aria-label. */
const ROTULO: Record<Situacao, string> = { ok: 'ok', atencao: 'atenção', falta: 'falta' };

export default function Saude() {
  const [checagens, setChecagens] = useState<Checagem[] | null>(null);
  const [erro, setErro] = useState(false);

  const conferir = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/saude', { cache: 'no-store' });
      if (r.status === 401) return irParaLogin();
      const { checagens: c } = await r.json();
      setChecagens(c ?? []);
      setErro(false);
    } catch {
      setErro(true);
    }
  }, []);

  useEffect(() => {
    conferir();
  }, [conferir]);

  const resumo = checagens ? resumoDaSaude(checagens) : null;

  return (
    <>
      <Cabecalho
        titulo="Estado da instalação"
        apoio="O que já está no lugar e o que ainda falta para o ateliê funcionar inteiro."
        acoes={
          <button onClick={conferir} className="btn btn-secundario">
            Conferir de novo
          </button>
        }
      />

      <div className="space-y-5 px-5 py-6 md:px-8">
        {erro && (
          <p className="border-l-2 border-linha bg-linha-clara px-4 py-3 text-sm text-linha">
            Não consegui conferir agora. Tente de novo em instantes.
          </p>
        )}

        {resumo && (
          <div
            className={`border-l-2 px-4 py-3 text-sm ${
              resumo === 'ok'
                ? 'border-mata bg-mata/5'
                : resumo === 'atencao'
                  ? 'border-fita-escura bg-fita/15'
                  : 'border-linha bg-linha-clara text-linha'
            }`}
          >
            {resumo === 'ok'
              ? 'Está tudo no lugar. O ateliê pode funcionar inteiro.'
              : resumo === 'atencao'
                ? `Funciona, mas ${contar(checagens!, 'atencao')} ${
                    contar(checagens!, 'atencao') === 1 ? 'coisa merece' : 'coisas merecem'
                  } atenção.`
                : `${contar(checagens!, 'falta')} ${
                    contar(checagens!, 'falta') === 1 ? 'coisa impede' : 'coisas impedem'
                  } o ateliê de funcionar inteiro.`}
          </div>
        )}

        <Cartao>
          <div className="border-b border-grade px-4 py-2.5">
            <Rotulo>Conferência</Rotulo>
          </div>
          {!checagens ? (
            <p className="px-5 py-10 text-sm text-tinta-suave">Conferindo…</p>
          ) : (
            <ul className="divide-y divide-grade">
              {checagens.map((c) => (
                <li key={c.item} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={`w-16 shrink-0 font-mono text-[10px] uppercase tracking-wider ${CORES[c.situacao]}`}
                  >
                    {ROTULO[c.situacao]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{c.item}</span>
                    <span className={`block text-xs ${CORES[c.situacao]}`}>{c.recado}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <p className="text-xs text-tinta-suave">
          Esta tela olha o que o painel enxerga. Para conferir o banco por dentro, cole o
          <span className="num"> supabase/conferir.sql</span> no SQL Editor do Supabase.
        </p>
      </div>
    </>
  );
}
