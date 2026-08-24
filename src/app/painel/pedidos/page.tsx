'use client';

import { useMemo, useState, useEffect } from 'react';
import { usePedidos } from '@/lib/dados';
import { moeda, dataCurta, horaDe } from '@/lib/formato';
import type { Pedido, Status } from '@/lib/tipos';
import { restanteDe } from '@/lib/tipos';
import { casaComBusca } from '@/lib/busca';
import { Cabecalho } from '@/components/Cabecalho';
import { PainelPedido } from '@/components/PainelPedido';
import { Cartao, Selo, Vazio, SemConexao } from '@/components/ui';

const FILTROS: { chave: Status | 'todos'; rotulo: string }[] = [
  { chave: 'novo', rotulo: 'Sem data' },
  { chave: 'agendado', rotulo: 'Marcados' },
  { chave: 'pronto', rotulo: 'Prontas' },
  { chave: 'entregue', rotulo: 'Entregues' },
  { chave: 'todos', rotulo: 'Todos' },
];

export default function Pedidos() {
  const { pedidos, carregando, erro, recarregar } = usePedidos();
  const [filtro, setFiltro] = useState<Status | 'todos'>('novo');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<Pedido | null>(null);

  useEffect(() => {
    if (!aberto) return;
    const atual = pedidos.find((p) => p.id === aberto.id);
    if (atual && atual.atualizado_em !== aberto.atualizado_em) setAberto(atual);
  }, [pedidos, aberto]);

  const contagem = useMemo(() => {
    const c: Record<string, number> = { todos: pedidos.length };
    pedidos.forEach((p) => (c[p.status] = (c[p.status] ?? 0) + 1));
    return c;
  }, [pedidos]);

  const lista = useMemo(
    () =>
      pedidos
        .filter((p) => (filtro === 'todos' ? p.status !== 'cancelado' : p.status === filtro))
        .filter((p) =>
          casaComBusca(busca, [p.cliente_nome, p.codigo, p.peca, p.descricao], [p.cliente_telefone])
        ),
    [pedidos, filtro, busca]
  );

  return (
    <>
      <Cabecalho
        titulo="Pedidos"
        apoio="Tudo que entrou pelo QR do ateliê."
        acoes={
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nome, código ou peça"
            className="campo w-56"
            aria-label="Buscar pedidos"
          />
        }
      />

      <div className="px-5 py-6 md:px-8">
        <SemConexao erro={erro} />

        <div className="mb-4 mt-4 flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.chave}
              onClick={() => setFiltro(f.chave)}
              className={`rounded border px-3 py-1.5 text-xs transition-colors ${
                filtro === f.chave
                  ? 'border-mata bg-mata text-papel'
                  : 'border-grade bg-papel text-tinta-suave hover:border-tinta-suave'
              }`}
            >
              {f.rotulo}
              <span className="num ml-1.5 opacity-60">{contagem[f.chave] ?? 0}</span>
            </button>
          ))}
        </div>

        <Cartao>
          {carregando ? (
            <p className="px-5 py-10 text-sm text-tinta-suave">Carregando…</p>
          ) : lista.length === 0 ? (
            <Vazio
              titulo={
                busca
                  ? 'Nenhum pedido com esse termo.'
                  : `Nada em "${FILTROS.find((f) => f.chave === filtro)?.rotulo}" por enquanto.`
              }
            />
          ) : (
            <ul className="divide-y divide-grade">
              {lista.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setAberto(p)}
                    className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-papel-fundo"
                  >
                    <span className="num hidden w-16 shrink-0 text-[11px] text-tinta-suave sm:block">
                      {p.codigo}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{p.cliente_nome}</span>
                        {p.urgente && (
                          <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-linha">
                            urgente
                          </span>
                        )}
                        {(p.pedido_fotos?.length ?? 0) > 0 && (
                          <span
                            title={`${p.pedido_fotos!.length} foto(s)`}
                            className="flex shrink-0 items-center gap-0.5 font-mono text-[9px] text-tinta-suave"
                          >
                            <svg width="11" height="11" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                              <rect x="1.5" y="4.5" width="15" height="11" />
                              <circle cx="9" cy="10" r="3" />
                            </svg>
                            {p.pedido_fotos!.length}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-tinta-suave">
                        {p.peca}
                        {p.descricao ? ` · ${p.descricao}` : ''}
                      </span>
                    </span>
                    <span className="hidden w-24 shrink-0 md:block">
                      <span className="num block text-xs">
                        {p.retirada_em ? dataCurta(p.retirada_em) : '—'}
                      </span>
                      <span className="block font-mono text-[10px] text-tinta-suave">
                        {p.retirada_em ? 'retirada' : `chegou ${horaDe(p.criado_em)}`}
                      </span>
                    </span>
                    <span className="w-20 shrink-0 text-right text-sm">
                      <span className="num block">
                        {p.valor_centavos ? moeda(p.valor_centavos) : '—'}
                      </span>
                      {p.sinal_centavos > 0 && p.status !== 'entregue' && (
                        <span className="num block text-[10px] text-tinta-suave">
                          falta {moeda(restanteDe(p))}
                        </span>
                      )}
                    </span>
                    <span className="hidden w-32 shrink-0 text-right lg:block">
                      <Selo status={p.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <p className="mt-3 text-xs text-tinta-suave">
          {lista.length} {lista.length === 1 ? 'pedido nesta lista' : 'pedidos nesta lista'}
        </p>
      </div>

      <PainelPedido
        pedido={aberto}
        pedidos={pedidos}
        aoFechar={() => setAberto(null)}
        aoAtualizar={recarregar}
      />
    </>
  );
}
