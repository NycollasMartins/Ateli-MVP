'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useServicos } from '@/lib/dados';
import { moeda } from '@/lib/formato';
import { useMarca, Logo } from '@/components/Marca';


export default function PrecosPublicos() {
  const marca = useMarca();
  const { servicos, carregando, erro } = useServicos(true);

  const categorias = useMemo(() => {
    const mapa = new Map<string, typeof servicos>();
    servicos.forEach((s) => mapa.set(s.categoria, [...(mapa.get(s.categoria) ?? []), s]));
    return [...mapa.entries()];
  }, [servicos]);

  return (
    <main className="min-h-dvh bg-papel-fundo pb-16">
      <header className="base-corte px-5 py-8 text-papel">
        <div className="mx-auto max-w-lg">
          <Logo className="mb-3 h-10 w-auto" />
          <p className="rotulo text-papel/50">Tabela de preços</p>
          <h1 className="mt-1.5 font-display text-3xl leading-tight">{marca.nome}</h1>
          <p className="mt-2 text-sm text-papel/70">
            Valores por serviço. Peça sob medida e customização são orçadas na conversa.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-5">
        <div className="papel-molde -mt-4 border border-grade px-6 py-7">
          {carregando && <p className="text-sm text-tinta-suave">Carregando…</p>}

          {!carregando && erro && (
            <p className="border-l-2 border-linha pl-3 text-sm">
              Não conseguimos carregar os valores agora. Tente de novo em instantes, ou pergunte
              direto no ateliê.
            </p>
          )}

          {!carregando && !erro && categorias.length === 0 && (
            <p className="border-l-2 border-grade pl-3 text-sm text-tinta-suave">
              A tabela de preços ainda não foi preenchida.
            </p>
          )}

          {categorias.map(([categoria, lista]) => (
            <section key={categoria} className="mb-7 last:mb-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-tinta-suave">
                {categoria}
              </p>
              <ul className="mt-2 divide-y divide-grade border-y border-grade">
                {lista.map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between gap-4 py-3">
                    <span className="text-sm leading-snug">
                      {s.nome}
                      {s.descricao && <span className="block text-xs text-tinta-suave">{s.descricao}</span>}
                      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-tinta-suave">
                        fica pronto em {s.prazo_dias} dias
                      </span>
                    </span>
                    <span className="num shrink-0 text-sm">
                      {s.preco_centavos ? moeda(s.preco_centavos) : 'a combinar'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <Link href="/f" className="btn btn-principal mt-5 w-full">
          Deixar uma peça
        </Link>
      </div>
    </main>
  );
}
