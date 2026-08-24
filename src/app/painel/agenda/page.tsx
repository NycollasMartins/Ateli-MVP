'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePedidos } from '@/lib/dados';
import { dataLocal, inicioSemana, fimSemana, moeda } from '@/lib/formato';
import type { Pedido } from '@/lib/tipos';
import { Cabecalho } from '@/components/Cabecalho';
import { PainelPedido } from '@/components/PainelPedido';
import { Cartao } from '@/components/ui';
import { useAviso } from '@/components/Avisos';
import { ConexaoGoogle } from '@/components/ConexaoGoogle';

const SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

const RECADO_DO_ERRO: Record<string, string> = {
  'falta-credencial': 'Faltam as credenciais do Google. Preencha-as no bloco abaixo, uma vez só.',
  estado: 'A conexão não começou por aqui e foi recusada. Clique em Conectar nesta tela.',
  'sem-codigo': 'O Google voltou sem a autorização. Provavelmente você cancelou na tela dele.',
  falha: 'A conexão com o Google não completou. Confira as credenciais e tente de novo.',
};

export default function Agenda() {
  const { pedidos, recarregar } = usePedidos(20_000);
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [aberto, setAberto] = useState<Pedido | null>(null);
  const avisar = useAviso();

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('conectado')) avisar('Google Agenda conectado. As retiradas vão aparecer lá.');
    // cada motivo manda procurar num lugar diferente: dizer sempre "confira as
    // credenciais" fazia ela mexer no .env quando o problema era outro
    const erro = p.get('erro');
    if (erro) avisar(RECADO_DO_ERRO[erro] ?? RECADO_DO_ERRO.falha, 'erro');
    if (p.toString()) window.history.replaceState({}, '', '/painel/agenda');
  }, [avisar]);

  const dias = useMemo(
    () =>
      eachDayOfInterval({
        start: inicioSemana(startOfMonth(mes)),
        end: fimSemana(endOfMonth(mes)),
      }),
    [mes]
  );

  const porDia = useMemo(() => {
    const mapa = new Map<string, Pedido[]>();
    pedidos
      .filter((p) => p.retirada_em && p.status !== 'cancelado')
      .forEach((p) => {
        const chave = p.retirada_em!.slice(0, 10);
        mapa.set(chave, [...(mapa.get(chave) ?? []), p]);
      });
    return mapa;
  }, [pedidos]);

  const doMes = pedidos.filter(
    (p) => p.retirada_em && isSameMonth(dataLocal(p.retirada_em)!, mes) && p.status !== 'cancelado'
  );

  return (
    <>
      <Cabecalho
        titulo="Agenda"
        apoio="As retiradas marcadas aqui vão direto para o seu Google Agenda."
        acoes={
          <>
            <button onClick={() => setMes(addMonths(mes, -1))} className="btn btn-secundario px-3">
              ‹
            </button>
            <span className="num min-w-36 text-center text-sm">
              {format(mes, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <button onClick={() => setMes(addMonths(mes, 1))} className="btn btn-secundario px-3">
              ›
            </button>
          </>
        }
      />

      <div className="space-y-5 px-5 py-6 md:px-8">
        <ConexaoGoogle />

        <Cartao className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-grade">
            {SEMANA.map((d) => (
              <div key={d} className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-tinta-suave">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {dias.map((dia) => {
              const lista = porDia.get(format(dia, 'yyyy-MM-dd')) ?? [];
              const foraDoMes = !isSameMonth(dia, mes);
              return (
                <div
                  key={dia.toISOString()}
                  className={`min-h-24 border-b border-r border-grade p-1.5 last:border-r-0 ${
                    foraDoMes ? 'bg-papel-fundo/60' : ''
                  }`}
                >
                  <div className="mb-1 flex justify-end">
                    <span
                      className={`num inline-flex h-5 w-5 items-center justify-center text-[11px] ${
                        isToday(dia) ? 'bg-linha text-papel' : foraDoMes ? 'text-tinta-suave/50' : 'text-tinta-suave'
                      }`}
                    >
                      {format(dia, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {lista.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setAberto(p)}
                        title={`${p.cliente_nome} — ${p.peca}`}
                        className={`block w-full truncate border-l-2 px-1.5 py-1 text-left text-[11px] leading-tight hover:bg-papel-fundo ${
                          p.status === 'entregue'
                            ? 'border-mata/40 text-tinta-suave line-through'
                            : p.status === 'pronto'
                              ? 'border-fita text-tinta'
                              : 'border-giz text-tinta'
                        }`}
                      >
                        <span className="num mr-1 text-tinta-suave">{p.retirada_hora}</span>
                        {p.cliente_nome.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Cartao>

        <p className="text-xs text-tinta-suave">
          {doMes.length} {doMes.length === 1 ? 'retirada marcada neste mês' : 'retiradas marcadas neste mês'} ·{' '}
          {moeda(doMes.reduce((s, p) => s + p.valor_centavos, 0))} previstos
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
