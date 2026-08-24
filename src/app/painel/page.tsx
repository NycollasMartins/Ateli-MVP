'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePedidos } from '@/lib/dados';
import { moeda, diasAte, dataCurta, inicioSemana, fimSemana, isoDia, prazoEmPalavras } from '@/lib/formato';
import type { Pedido } from '@/lib/tipos';
import { restanteDe } from '@/lib/tipos';
import { resumoDoPainel } from '@/lib/resumo';
import { Cabecalho } from '@/components/Cabecalho';
import { FitaMetrica } from '@/components/FitaMetrica';
import { PainelPedido } from '@/components/PainelPedido';
import { AvisarClientes } from '@/components/AvisarClientes';
import { Cartao, Metrica, Selo, Vazio, SemConexao } from '@/components/ui';
import { useAviso } from '@/components/Avisos';

export default function VisaoGeral() {
  const { pedidos, carregando, erro, recarregar, chegaram, limparChegaram } = usePedidos();
  const [aberto, setAberto] = useState<Pedido | null>(null);
  const avisar = useAviso();

  useEffect(() => {
    if (!chegaram.length) return;
    const p = chegaram[0];
    avisar(
      chegaram.length === 1
        ? `Pedido novo: ${p.cliente_nome} — ${p.peca.toLowerCase()}`
        : `${chegaram.length} pedidos novos chegaram`
    );
    limparChegaram();
  }, [chegaram, avisar, limparChegaram]);

  // Quem digita à mão o endereço de uma tela que não pode abrir cai aqui. Sem
  // dizer nada, a Visão geral aparecendo do nada parece defeito do painel.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('semAlcada')) return;
    avisar('Essa parte do painel é só para quem tem acesso de administrador.', 'erro');
    window.history.replaceState({}, '', '/painel');
  }, [avisar]);

  // mantém o painel lateral com os dados frescos depois de salvar
  useEffect(() => {
    if (!aberto) return;
    const atual = pedidos.find((p) => p.id === aberto.id);
    if (atual && atual.atualizado_em !== aberto.atualizado_em) setAberto(atual);
  }, [pedidos, aberto]);

  const dados = useMemo(() => resumoDoPainel(pedidos), [pedidos]);

  return (
    <>
      <Cabecalho
        titulo="Visão geral"
        apoio={
          carregando
            ? 'Carregando…'
            : `${dados.naBancada.length} peças na bancada · ${dados.novos.length} sem data marcada`
        }
        acoes={
          <Link href="/painel/pedidos" className="btn btn-secundario">
            Ver todos os pedidos
          </Link>
        }
      />

      <div className="space-y-5 px-5 py-6 md:px-8">
        <SemConexao erro={erro} />

        <FitaMetrica pedidos={pedidos} />

        <AvisarClientes pedidos={pedidos} aoAvisar={recarregar} />

        <div className="grid grid-cols-2 divide-x divide-y divide-grade border border-grade bg-papel sm:grid-cols-4 sm:divide-y-0">
          <Metrica
            rotulo="Caixa desta semana"
            valor={moeda(dados.caixaSemana)}
            apoio={`${dados.qtdSemana} entregas · ${dataCurta(isoDia(inicioSemana(new Date())))} a ${dataCurta(isoDia(fimSemana(new Date())))}`}
            destaque
          />
          <Metrica
            rotulo="Ainda a receber"
            valor={moeda(dados.aReceber)}
            apoio={
              dados.sinaisNaMao
                ? `${moeda(dados.sinaisNaMao)} já recebidos em sinal`
                : 'peças na bancada'
            }
          />
          <Metrica
            rotulo="Retiradas hoje"
            valor={String(dados.hojeEntregas.length)}
            apoio={dados.hojeEntregas.map((p) => p.cliente_nome.split(' ')[0]).join(', ') || 'nada marcado'}
          />
          <Metrica rotulo="Sem data marcada" valor={String(dados.novos.length)} apoio="esperando você" />
        </div>

        {dados.novos.length > 0 && (
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="rotulo">Chegou pelo QR e ainda não tem data</p>
              <p className="num text-[11px] text-tinta-suave">{dados.novos.length}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {dados.novos.slice(0, 6).map((p) => (
                <button key={p.id} onClick={() => setAberto(p)} className="alinhavo p-4 text-left hover:bg-papel-fundo">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-base leading-tight">{p.cliente_nome}</p>
                    <span className="num text-[10px] text-tinta-suave">{p.codigo}</span>
                  </div>
                  <p className="mt-1 text-sm text-tinta-suave">{p.peca}</p>
                  {p.descricao && <p className="mt-2 line-clamp-2 text-xs text-tinta-suave">{p.descricao}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="num text-sm">{p.valor_centavos ? moeda(p.valor_centavos) : 'a orçar'}</span>
                    <span className="text-xs text-giz underline underline-offset-4">Marcar retirada</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="rotulo">Retiradas atrasadas e dos próximos 3 dias</p>
            {dados.atrasadas.length > 0 && (
              <p className="font-mono text-[11px] uppercase tracking-wider text-linha">
                {dados.atrasadas.length}{' '}
                {dados.atrasadas.length === 1 ? 'atrasada' : 'atrasadas'}
              </p>
            )}
          </div>
          <Cartao>
            {dados.proximas.length === 0 ? (
              <Vazio titulo="Nada atrasado e nada marcado para os próximos três dias." />
            ) : (
              <ul className="divide-y divide-grade">
                {dados.proximas.map((p) => {
                  const dias = diasAte(p.retirada_em)!;
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => setAberto(p)}
                        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-papel-fundo"
                      >
                        <div className="w-20 shrink-0">
                          <p className="num text-sm">{dataCurta(p.retirada_em)}</p>
                          <p
                            className={`font-mono text-[10px] uppercase tracking-wider ${
                              dias < 0 ? 'text-linha' : 'text-tinta-suave'
                            }`}
                          >
                            {prazoEmPalavras(dias)}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.cliente_nome}</p>
                          <p className="truncate text-xs text-tinta-suave">
                            {p.peca} · {p.retirada_hora}
                          </p>
                        </div>
                        <span className="hidden text-right text-sm sm:block">
                          <span className="num block">
                            {moeda(p.sinal_centavos ? restanteDe(p) : p.valor_centavos)}
                          </span>
                          {p.sinal_centavos > 0 && (
                            <span className="block font-mono text-[10px] uppercase tracking-wider text-tinta-suave">
                              falta receber
                            </span>
                          )}
                        </span>
                        <Selo status={p.status} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Cartao>
        </section>
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
