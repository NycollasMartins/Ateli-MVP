'use client';

import { useMemo, useState } from 'react';
import { usePedidos } from '@/lib/dados';
import { agruparClientes, type Cliente } from '@/lib/clientes';
import { casaComBusca } from '@/lib/busca';
import { moeda, dataCurta, horaDe, linkWhats, isoDia } from '@/lib/formato';
import type { Pedido } from '@/lib/tipos';
import { Cabecalho } from '@/components/Cabecalho';
import { PainelPedido } from '@/components/PainelPedido';
import { Cartao, Metrica, Rotulo, Selo, Vazio, Linha } from '@/components/ui';
import { useJanelaModal } from '@/lib/janela';

const primeiroNome = (n: string) => n.trim().split(/\s+/)[0];

/** Ficha da cliente: tudo que ela já trouxe, de uma vez. */
function FichaDaCliente({
  cliente,
  aoFechar,
  aoAbrirPedido,
}: {
  cliente: Cliente;
  aoFechar: () => void;
  aoAbrirPedido: (p: Pedido) => void;
}) {
  const janela = useJanelaModal<HTMLElement>(true, aoFechar);

  const ticket = cliente.entregues ? Math.round(cliente.totalGasto / cliente.entregues) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-mata-escuro/40" onClick={aoFechar} aria-label="Fechar ficha" />
      <section
        ref={janela}
        role="dialog"
        aria-modal="true"
        aria-label={`Ficha de ${cliente.nome}`}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-grade bg-papel shadow-xl outline-none"
      >
        <header className="sticky top-0 z-10 border-b border-grade bg-papel px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="rotulo">Cliente desde {dataCurta(isoDia(new Date(cliente.desde)))}</p>
              <h2 className="truncate font-display text-xl leading-tight">{cliente.nome}</h2>
            </div>
            <button onClick={aoFechar} className="btn btn-secundario px-2 py-1 text-xs">
              Fechar
            </button>
          </div>
        </header>

        <div className="space-y-6 px-5 py-5">
          <div>
            <Rotulo>Contato</Rotulo>
            <a
              href={linkWhats(cliente.telefone, `Oi ${primeiroNome(cliente.nome)}! Aqui é do ateliê.`)}
              target="_blank"
              rel="noreferrer"
              className="num mt-1 block text-sm text-giz underline underline-offset-4"
            >
              {cliente.telefone}
            </a>
            {cliente.email && <p className="text-sm text-tinta-suave">{cliente.email}</p>}
          </div>

          <div className="grid grid-cols-3 divide-x divide-grade border border-grade">
            <Metrica rotulo="Já gastou" valor={moeda(cliente.totalGasto)} apoio={`${cliente.entregues} entregues`} />
            <Metrica rotulo="Por peça" valor={moeda(ticket)} apoio="em média" />
            <Metrica
              rotulo="Na bancada"
              valor={String(cliente.naBancada)}
              apoio={cliente.aReceber ? `${moeda(cliente.aReceber)} a receber` : 'nada aberto'}
            />
          </div>

          {cliente.pecas.length > 0 && (
            <div>
              <Rotulo>O que ela costuma trazer</Rotulo>
              <p className="mt-1 text-sm">{cliente.pecas.join(' · ')}</p>
            </div>
          )}

          <Linha />

          <div>
            <Rotulo>Todos os pedidos ({cliente.pedidos.length})</Rotulo>
            <ul className="mt-2 divide-y divide-grade border border-grade">
              {cliente.pedidos.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => aoAbrirPedido(p)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-papel-fundo"
                  >
                    <span className="num w-20 shrink-0 text-[11px] text-tinta-suave">
                      {horaDe(p.criado_em).slice(0, 5)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{p.peca}</span>
                      {p.descricao && (
                        <span className="block truncate text-xs text-tinta-suave">{p.descricao}</span>
                      )}
                    </span>
                    <span className="num shrink-0 text-sm">
                      {p.valor_centavos ? moeda(p.valor_centavos) : '—'}
                    </span>
                    <Selo status={p.status} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Clientes() {
  const { pedidos, carregando, recarregar } = usePedidos(30_000);
  const [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);
  const [pedidoAberto, setPedidoAberto] = useState<Pedido | null>(null);

  const clientes = useMemo(() => agruparClientes(pedidos), [pedidos]);

  const lista = useMemo(
    () => clientes.filter((c) => casaComBusca(busca, [c.nome, ...c.pecas], [c.telefone, c.chave])),
    [clientes, busca]
  );

  const cliente = aberta ? clientes.find((c) => c.chave === aberta) ?? null : null;
  const repetem = clientes.filter((c) => c.visitas > 1).length;

  return (
    <>
      <Cabecalho
        titulo="Clientes"
        apoio={
          carregando
            ? 'Carregando…'
            : `${clientes.length} pessoas · ${repetem} já voltaram mais de uma vez`
        }
        acoes={
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nome, telefone ou peça"
            className="campo w-56"
            aria-label="Buscar clientes"
          />
        }
      />

      <div className="px-5 py-6 md:px-8">
        <Cartao>
          {carregando ? (
            <p className="px-5 py-10 text-sm text-tinta-suave">Carregando…</p>
          ) : lista.length === 0 ? (
            <Vazio
              titulo={
                busca
                  ? 'Ninguém com esse termo.'
                  : 'Assim que chegar o primeiro pedido pelo QR, a cliente aparece aqui.'
              }
            />
          ) : (
            <ul className="divide-y divide-grade">
              {lista.map((c) => (
                <li key={c.chave}>
                  <button
                    onClick={() => setAberta(c.chave)}
                    className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-papel-fundo"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{c.nome}</span>
                        {c.visitas > 1 && (
                          <span className="shrink-0 rounded border border-fita/50 bg-fita/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fita-escura">
                            {c.visitas}ª vez
                          </span>
                        )}
                        {c.naBancada > 0 && (
                          <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-giz">
                            na bancada
                          </span>
                        )}
                      </span>
                      <span className="num block truncate text-xs text-tinta-suave">
                        {c.telefone}
                      </span>
                    </span>
                    <span className="hidden w-28 shrink-0 md:block">
                      <span className="num block text-xs">{dataCurta(isoDia(new Date(c.ultimoEm)))}</span>
                      <span className="block font-mono text-[10px] text-tinta-suave">último pedido</span>
                    </span>
                    <span className="w-24 shrink-0 text-right">
                      <span className="num block text-sm">{moeda(c.totalGasto)}</span>
                      <span className="block font-mono text-[10px] text-tinta-suave">já gastou</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <p className="mt-3 text-xs text-tinta-suave">
          {lista.length} {lista.length === 1 ? 'pessoa nesta lista' : 'pessoas nesta lista'}
        </p>
      </div>

      {cliente && (
        <FichaDaCliente
          cliente={cliente}
          aoFechar={() => setAberta(null)}
          aoAbrirPedido={(p) => setPedidoAberto(p)}
        />
      )}

      <PainelPedido
        pedido={pedidoAberto}
        pedidos={pedidos}
        aoFechar={() => setPedidoAberto(null)}
        aoAtualizar={recarregar}
      />
    </>
  );
}
