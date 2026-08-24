'use client';

import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePedidos, useFechamentos, useDespesas, useDespesasFixas, enviar } from '@/lib/dados';
import {
  moeda,
  moedaCurta,
  inicioSemana,
  fimSemana,
  isoDia,
  semanasAnteriores,
  dataCurta,
} from '@/lib/formato';
import type { Pedido, Despesa, DespesaFixa } from '@/lib/tipos';
import { restanteDe, CATEGORIAS_DESPESA } from '@/lib/tipos';
import { Cabecalho } from '@/components/Cabecalho';
import { Cartao, Metrica, Rotulo, Vazio } from '@/components/ui';
import { useAviso } from '@/components/Avisos';
import { periodoDe, recuar, avancar, noPresente } from '@/lib/periodo';
import { categoriaQueMaisPesa } from '@/lib/despesas';
import {
  balancoDoPeriodo,
  entregasEntre as entregasNoIntervalo,
  despesasEntre as despesasNoIntervalo,
  somaPedidos,
  somaDespesas,
} from '@/lib/financeiro';
import { paraCentavos } from '@/lib/dinheiro';
import { baixarCSV } from '@/lib/csv';
import { linhasDoExtrato, extratoEmCSV, nomeDoArquivo } from '@/lib/extrato';

const entregueEm = (p: Pedido) => (p.entregue_em ? new Date(p.entregue_em) : null);



/** Dinheiro curto que aguenta ficar no vermelho. */
const curto = (c: number) => (c < 0 ? '−' : '') + moedaCurta(Math.abs(c));

type Semana = { rotulo: string; receita: number; despesa: number; atual: boolean };

/** Faturamento e despesa por semana, desenhados como uma fita métrica deitada. */
function GraficoSemanas({ semanas }: { semanas: Semana[] }) {
  const maior = Math.max(...semanas.flatMap((s) => [s.receita, s.despesa]), 1);
  const LARG = 74;
  const ALT = 190;
  const BASE = 150;
  const UTIL = BASE * 0.75;
  const largura = semanas.length * LARG;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${largura} ${ALT}`}
        className="block h-[190px] w-full min-w-[560px]"
        role="img"
        aria-label="Receita e despesa por semana"
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1="0" y1={BASE - UTIL * f} x2={largura} y2={BASE - UTIL * f} className="stroke-grade" strokeWidth="1" strokeDasharray="3 4" />
            <text x="2" y={BASE - UTIL * f - 4} className="font-mono fill-tinta-suave" fontSize="8" >
              {moedaCurta(maior * f)}
            </text>
          </g>
        ))}

        {semanas.map((s, i) => {
          const hR = (s.receita / maior) * UTIL;
          const hD = (s.despesa / maior) * UTIL;
          const x = i * LARG + 14;
          const lucro = s.receita - s.despesa;
          const topo = BASE - Math.max(hR, hD);
          return (
            <g key={i}>
              <rect
                x={x}
                y={BASE - hR}
                width="24"
                height={Math.max(hR, 2)}
                className={s.atual ? 'fill-fita' : 'fill-mata'}
              />
              <rect x={x + 26} y={BASE - hD} width="16" height={Math.max(hD, s.despesa > 0 ? 2 : 0)} className="fill-linha" />
              {(s.receita > 0 || s.despesa > 0) && (
                <text
                  x={x + 21}
                  y={topo - 7}
                  textAnchor="middle"
                  className={`font-mono ${lucro < 0 ? 'fill-linha' : 'fill-tinta'}`}
                  fontSize="10"
                >
                  {curto(lucro)}
                </text>
              )}
            </g>
          );
        })}

        {/* fita métrica como eixo */}
        <rect x="0" y={BASE} width={largura} height="34" className="fill-fita" />
        <rect x="0" y={BASE} width={largura} height="2" className="fill-fita-escura" opacity="0.35" />
        {semanas.map((s, i) => (
          <g key={`t${i}`}>
            <line x1={i * LARG} y1={BASE} x2={i * LARG} y2={BASE + 12} className="stroke-tinta" strokeWidth="1.4" />
            <line x1={i * LARG + LARG / 2} y1={BASE} x2={i * LARG + LARG / 2} y2={BASE + 7} className="stroke-tinta" strokeWidth="1" opacity="0.4" />
            <text x={i * LARG + LARG / 2} y={BASE + 26} textAnchor="middle" className="font-mono fill-tinta" fontSize="10" >
              {s.rotulo}
            </text>
          </g>
        ))}
      </svg>

      {/* Os mesmos números em texto: sem isto, quem usa leitor de tela não tem
          acesso nenhum ao dinheiro das últimas semanas. */}
      <ul className="sr-only">
        {semanas.map((s, i) => (
          <li key={`t${i}`}>
            Semana de {s.rotulo}: receita {moeda(s.receita)}, despesa {moeda(s.despesa)}, lucro{' '}
            {moeda(s.receita - s.despesa)}.
          </li>
        ))}
      </ul>
    </div>
  );
}

function Amostra({ cor, children }: { cor: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 ${cor}`} aria-hidden />
      {children}
    </span>
  );
}

export default function Financeiro() {
  const { pedidos } = usePedidos(30_000);
  const { fechamentos, erro: erroFechamentos, recarregar: recarregarFechamentos } = useFechamentos();
  const { despesas, recarregar: recarregarDespesas } = useDespesas();
  const { fixas, erro: erroFixas, recarregar: recarregarFixas } = useDespesasFixas();
  const [periodo, setPeriodo] = useState<'semana' | 'mes'>('semana');
  /**
   * Quantos períodos para trás. Zero é agora.
   *
   * Sem isto o Financeiro só sabia mostrar "hoje": não dava para conferir a
   * semana passada, nem baixar o CSV do mês fechado — que é justamente o que
   * se manda para o contador.
   */
  const [recuo, setRecuo] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const avisar = useAviso();

  const hoje = new Date();
  const iniSemana = inicioSemana(hoje);
  const fimSem = fimSemana(hoje);

  const ehSemana = periodo === 'semana';

  // a aritmética mora em src/lib/periodo.ts, coberta por varredura de dois anos
  const janela = periodoDe(hoje, periodo, recuo);
  const { ini, fim } = janela;

  const noPeriodoAtual = noPresente(recuo);
  const nomeDoPeriodo = ehSemana
    ? `${dataCurta(isoDia(ini))} a ${dataCurta(isoDia(fim))}`
    : format(ini, "MMMM 'de' yyyy", { locale: ptBR });


  // todas as contas de dinheiro moram em src/lib/financeiro.ts, com varredura
  const balanco = balancoDoPeriodo(pedidos, despesas, janela);
  const { receita, gasto, lucro, ticket, variacao } = balanco;
  const entregasPeriodo = balanco.entregas;
  const despesasPeriodo = balanco.despesas;

  const entregasEntre = (de: Date, ate: Date) => entregasNoIntervalo(pedidos, de, ate);
  const despesasEntre = (de: Date, ate: Date) => despesasNoIntervalo(despesas, de, ate);


  const naBancada = pedidos.filter((p) => ['agendado', 'pronto'].includes(p.status));
  const aReceber = naBancada.reduce((s, p) => s + restanteDe(p), 0);
  const sinaisNaMao = naBancada.reduce((s, p) => s + p.sinal_centavos, 0);


  /**
   * Sem memo de propósito.
   *
   * Era um `useMemo` com dependências incompletas: quando a navegação por
   * período chegou, o rótulo passou a congelar no período anterior, porque
   * `recuo` não estava na lista — e o `eslint-disable` logo acima escondia
   * exatamente o aviso que teria apontado isso. Percorrer as despesas de um
   * período é barato; a dependência esquecida é que sai cara.
   */
  const maiorCategoria = categoriaQueMaisPesa(despesasPeriodo);

  // as 8 semanas são sempre as últimas 8, independentes da navegação de período
  const semanas = semanasAnteriores(8).map((s) => ({
    rotulo: s.rotulo,
    receita: somaPedidos(entregasEntre(s.inicio, s.fim)),
    despesa: somaDespesas(despesasEntre(s.inicio, s.fim)),
    atual: isoDia(s.inicio) === isoDia(iniSemana),
  }));

  const jaFechada = fechamentos.some((f) => f.semana_inicio === isoDia(iniSemana));

  /** Extrato do período: entrega vira entrada, despesa vira saída, tudo numa lista só. */
  function baixarExtrato() {
    const linhas = linhasDoExtrato(entregasPeriodo, despesasPeriodo);
    if (linhas.length === 0) return avisar('Não há nada lançado neste período para baixar.', 'erro');

    baixarCSV(nomeDoArquivo(ini, fim), extratoEmCSV(entregasPeriodo, despesasPeriodo));
    avisar(`${linhas.length} lançamentos baixados.`);
  }

  /**
   * Fechar o caixa é coisa que se faz na segunda de manhã, pensando na semana
   * que acabou. Antes o botão fechava sempre a semana corrente — quase vazia
   * nesse momento — e a semana encerrada ficava sem registro, sem jeito de
   * voltar nela.
   */
  const semanaPassada = { inicio: subDays(iniSemana, 7), fim: subDays(fimSem, 7) };
  const passadaAberta = !fechamentos.some(
    (f) => f.semana_inicio === isoDia(semanaPassada.inicio)
  );

  async function fecharCaixa(inicio: Date, fim: Date) {
    const entregas = entregasEntre(inicio, fim);
    const receitaDaSemana = somaPedidos(entregas);
    const despesaDaSemana = somaDespesas(despesasEntre(inicio, fim));

    setSalvando(true);
    try {
      await enviar('/api/admin/fechamentos', 'POST', {
        semana_inicio: isoDia(inicio),
        semana_fim: isoDia(fim),
        total_centavos: receitaDaSemana,
        despesas_centavos: despesaDaSemana,
        pedidos_qtd: entregas.length,
      });
      await recarregarFechamentos();
      avisar(
        `Caixa de ${dataCurta(isoDia(inicio))} a ${dataCurta(isoDia(fim))} fechado: ` +
          `${moeda(receitaDaSemana - despesaDaSemana)} de lucro.`
      );
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Financeiro"
        apoio="Entregas registradas entram como receita; o que você compra sai como despesa."
        acoes={
          <>
            <div className="flex gap-1">
              {(['semana', 'mes'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriodo(p);
                    setRecuo(0);
                  }}
                  className={`rounded border px-2.5 py-1.5 text-xs ${
                    periodo === p ? 'border-mata bg-mata text-papel' : 'border-grade bg-papel text-tinta-suave'
                  }`}
                >
                  {p === 'semana' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setRecuo(recuar)}
                aria-label={ehSemana ? 'Semana anterior' : 'Mês anterior'}
                className="btn btn-secundario px-2.5 py-1.5"
              >
                ‹
              </button>
              <span className="num min-w-40 text-center text-xs">{nomeDoPeriodo}</span>
              <button
                onClick={() => setRecuo(avancar)}
                disabled={noPeriodoAtual}
                aria-label={ehSemana ? 'Semana seguinte' : 'Mês seguinte'}
                className="btn btn-secundario px-2.5 py-1.5"
              >
                ›
              </button>
            </div>
            <button onClick={baixarExtrato} className="btn btn-secundario">
              Baixar CSV
            </button>
            {passadaAberta && (
              <button
                onClick={() => fecharCaixa(semanaPassada.inicio, semanaPassada.fim)}
                disabled={salvando}
                className="btn btn-secundario"
              >
                Fechar a semana passada ({dataCurta(isoDia(semanaPassada.inicio))} a{' '}
                {dataCurta(isoDia(semanaPassada.fim))})
              </button>
            )}
            <button
              onClick={() => fecharCaixa(iniSemana, fimSem)}
              disabled={salvando}
              className="btn btn-principal"
            >
              {jaFechada ? 'Refazer' : 'Fechar'} o caixa de {dataCurta(isoDia(iniSemana))} a{' '}
              {dataCurta(isoDia(fimSem))}
            </button>
          </>
        }
      />

      <div className="space-y-5 px-5 py-6 md:px-8">
        <div className="grid grid-cols-2 divide-x divide-y divide-grade border border-grade bg-papel sm:grid-cols-4 sm:divide-y-0">
          <Metrica
            rotulo={noPeriodoAtual ? (ehSemana ? 'Lucro da semana' : 'Lucro do mês') : 'Lucro do período'}
            valor={moeda(lucro)}
            apoio={
              lucro < 0
                ? 'você gastou mais do que recebeu'
                : variacao === null
                  ? ehSemana
                    ? `${dataCurta(isoDia(ini))} a ${dataCurta(isoDia(fim))}`
                    : format(ini, 'MMMM', { locale: ptBR })
                  : `${variacao >= 0 ? '+' : ''}${variacao}% em relação ${ehSemana ? 'à semana passada' : 'ao mês passado'}`
            }
            destaque
          />
          <Metrica
            rotulo="Receita"
            valor={moeda(receita)}
            apoio={
              entregasPeriodo.length
                ? `${entregasPeriodo.length} entregas · ${moeda(ticket)} em média`
                : 'nenhuma entrega no período'
            }
          />
          <Metrica
            rotulo="Despesas"
            valor={moeda(gasto)}
            apoio={maiorCategoria ?? 'nada lançado no período'}
          />
          <Metrica
            rotulo="A receber"
            valor={moeda(aReceber)}
            apoio={sinaisNaMao ? `${moeda(sinaisNaMao)} já entraram como sinal` : 'peças ainda na bancada'}
          />
        </div>

        <Cartao>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-grade px-4 py-2.5">
            <Rotulo>Últimas 8 semanas</Rotulo>
            <p className="flex gap-3 font-mono text-[10px] uppercase tracking-wider text-tinta-suave">
              <Amostra cor="bg-mata">receita</Amostra>
              <Amostra cor="bg-linha">despesa</Amostra>
              <span>número = lucro</span>
            </p>
          </div>
          <div className="p-3">
            <GraficoSemanas semanas={semanas} />
          </div>
        </Cartao>

        <Despesas
          despesas={despesasPeriodo}
          total={gasto}
          periodo={periodo}
          aoMudar={recarregarDespesas}
        />

        <DespesasFixas
          fixas={fixas}
          erro={erroFixas}
          aoMudar={async () => {
            await recarregarFixas();
            await recarregarDespesas();
          }}
        />

        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <Cartao>
            <div className="flex items-center justify-between border-b border-grade px-4 py-2.5">
              <Rotulo>Entregas {ehSemana ? 'da semana' : 'do mês'}</Rotulo>
              <p className="num text-[11px] text-tinta-suave">{entregasPeriodo.length}</p>
            </div>
            {entregasPeriodo.length === 0 ? (
              <Vazio titulo="Nenhuma entrega registrada neste período ainda." />
            ) : (
              <ul className="divide-y divide-grade">
                {[...entregasPeriodo]
                  .sort((a, b) => (b.entregue_em ?? '').localeCompare(a.entregue_em ?? ''))
                  .map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="num w-14 shrink-0 text-xs text-tinta-suave">
                        {format(entregueEm(p)!, 'dd/MM')}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{p.cliente_nome}</span>
                      <span className="hidden shrink-0 text-xs text-tinta-suave sm:block">
                        {p.forma_pagamento ?? '—'}
                      </span>
                      <span className="num w-20 shrink-0 text-right">{moeda(p.valor_centavos)}</span>
                    </li>
                  ))}
                <li className="flex items-center justify-between bg-papel-fundo px-4 py-2.5 text-sm">
                  <span className="rotulo">Total</span>
                  <span className="num">{moeda(receita)}</span>
                </li>
              </ul>
            )}
          </Cartao>

          <Cartao>
            <div className="border-b border-grade px-4 py-2.5">
              <Rotulo>Caixas fechados</Rotulo>
            </div>
            {erroFechamentos ? (
              <p className="border-l-2 border-linha bg-linha-clara px-4 py-3 text-sm text-linha">
                Não consegui carregar o histórico. Ele não foi perdido — tente de novo em
                instantes.
              </p>
            ) : fechamentos.length === 0 ? (
              <Vazio titulo="Feche o caixa no fim da semana para guardar o histórico." />
            ) : (
              <ul className="divide-y divide-grade">
                {fechamentos.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span>
                      <span className="num block text-xs text-tinta-suave">
                        {dataCurta(f.semana_inicio)} a {dataCurta(f.semana_fim)}
                      </span>
                      <span className="text-xs text-tinta-suave">
                        {f.pedidos_qtd} {f.pedidos_qtd === 1 ? 'entrega' : 'entregas'}
                        {f.despesas_centavos > 0 && ` · ${moeda(f.despesas_centavos)} de despesa`}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="num block">{moeda(f.total_centavos - f.despesas_centavos)}</span>
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-tinta-suave">
                        lucro
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>
      </div>
    </>
  );
}

/** Lançamento e lista das despesas do período escolhido. */
function Despesas({
  despesas,
  total,
  periodo,
  aoMudar,
}: {
  despesas: Despesa[];
  total: number;
  periodo: 'semana' | 'mes';
  aoMudar: () => Promise<void>;
}) {
  const avisar = useAviso();
  const [salvando, setSalvando] = useState(false);
  const [nova, setNova] = useState({
    descricao: '',
    categoria: CATEGORIAS_DESPESA[0],
    valor: '',
    data: isoDia(new Date()),
  });

  async function lancar() {
    if (!nova.descricao.trim()) return avisar('Escreva no que você gastou.', 'erro');
    const centavos = paraCentavos(nova.valor);
    if (centavos <= 0) return avisar('Escreva quanto custou.', 'erro');
    setSalvando(true);
    try {
      await enviar('/api/admin/despesas', 'POST', {
        descricao: nova.descricao,
        categoria: nova.categoria,
        valor_centavos: centavos,
        data: nova.data,
      });
      setNova({ descricao: '', categoria: nova.categoria, valor: '', data: nova.data });
      await aoMudar();
      avisar(`${moeda(centavos)} lançados como despesa.`);
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function apagar(d: Despesa) {
    if (!window.confirm(`Apagar "${d.descricao}" de ${moeda(d.valor_centavos)}?`)) return;
    try {
      await enviar(`/api/admin/despesas/${d.id}`, 'DELETE');
      await aoMudar();
      avisar('Despesa apagada.');
    } catch (e) {
      avisar((e as Error).message, 'erro');
    }
  }

  return (
    <Cartao>
      <div className="flex items-center justify-between border-b border-grade px-4 py-2.5">
        <Rotulo>Despesas {periodo === 'semana' ? 'da semana' : 'do mês'}</Rotulo>
        <p className="num text-[11px] text-tinta-suave">{moeda(total)}</p>
      </div>

      <div className="grid gap-2 border-b border-grade bg-papel-fundo p-3 sm:grid-cols-[8rem_1fr_9rem_7rem_auto]">
        <input
          type="date"
          value={nova.data}
          onChange={(e) => setNova({ ...nova, data: e.target.value })}
          aria-label="Dia da despesa"
          className="campo num"
        />
        <input
          value={nova.descricao}
          onChange={(e) => setNova({ ...nova, descricao: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && lancar()}
          placeholder="Linha, zíper, tecido, aluguel…"
          aria-label="No que você gastou"
          className="campo"
        />
        <select
          value={nova.categoria}
          onChange={(e) => setNova({ ...nova, categoria: e.target.value })}
          aria-label="Categoria da despesa"
          className="campo"
        >
          {CATEGORIAS_DESPESA.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          value={nova.valor}
          onChange={(e) => setNova({ ...nova, valor: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && lancar()}
          inputMode="decimal"
          placeholder="R$ 0,00"
          aria-label="Quanto custou"
          className="campo num"
        />
        <button onClick={lancar} disabled={salvando} className="btn btn-principal">
          Lançar
        </button>
      </div>

      {despesas.length === 0 ? (
        <Vazio titulo="Nada lançado neste período. Anote linha, zíper, tecido e aluguel para ver o lucro de verdade." />
      ) : (
        <ul className="divide-y divide-grade">
          {despesas.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="num w-14 shrink-0 text-xs text-tinta-suave">{dataCurta(d.data)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{d.descricao}</span>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-tinta-suave">
                  {d.categoria}
                  {d.despesa_fixa_id && ' · todo mês'}
                </span>
              </span>
              <span className="num w-20 shrink-0 text-right text-linha">− {moeda(d.valor_centavos)}</span>
              <button
                onClick={() => apagar(d)}
                aria-label={`Apagar despesa ${d.descricao}`}
                className="shrink-0 rounded border border-grade px-2 py-1 text-xs text-tinta-suave hover:border-linha hover:text-linha"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}

/** O que sai todo mês sozinho: aluguel, luz, internet. */
function DespesasFixas({
  fixas,
  erro,
  aoMudar,
}: {
  fixas: DespesaFixa[];
  erro: boolean;
  aoMudar: () => Promise<void>;
}) {
  const avisar = useAviso();
  const [salvando, setSalvando] = useState(false);
  const [nova, setNova] = useState({
    descricao: '',
    categoria: CATEGORIAS_DESPESA[1] ?? CATEGORIAS_DESPESA[0],
    valor: '',
    dia: '5',
  });

  const totalMes = fixas.filter((f) => f.ativa).reduce((s, f) => s + f.valor_centavos, 0);

  async function criar() {
    if (!nova.descricao.trim()) return avisar('Escreva o que se repete.', 'erro');
    const centavos = paraCentavos(nova.valor);
    if (centavos <= 0) return avisar('Escreva quanto custa.', 'erro');
    setSalvando(true);
    try {
      const { lancadas, aviso } = await enviar<{ lancadas: number; aviso?: string }>(
        '/api/admin/despesas-fixas',
        'POST',
        {
          descricao: nova.descricao,
          categoria: nova.categoria,
          valor_centavos: centavos,
          dia_do_mes: Number(nova.dia) || 1,
        }
      );
      setNova({ ...nova, descricao: '', valor: '' });
      await aoMudar();

      // prometer "entra sozinha" quando o lançamento falhou é o pior desfecho:
      // ela só descobriria meses depois, pelo lucro errado
      if (aviso) avisar(aviso, 'erro');
      else
        avisar(
          lancadas > 0
            ? `Pronto. O deste mês já entrou nas despesas.`
            : `Pronto. Entra sozinha todo dia ${nova.dia}.`
        );
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(f: DespesaFixa) {
    try {
      await enviar(`/api/admin/despesas-fixas/${f.id}`, 'PATCH', { ativa: !f.ativa });
      await aoMudar();
      avisar(f.ativa ? `${f.descricao} pausada.` : `${f.descricao} volta a entrar todo mês.`);
    } catch (e) {
      avisar((e as Error).message, 'erro');
    }
  }

  async function remover(f: DespesaFixa) {
    if (!window.confirm(`Parar de lançar "${f.descricao}"? O que já foi lançado continua no caixa.`))
      return;
    try {
      await enviar(`/api/admin/despesas-fixas/${f.id}`, 'DELETE');
      await aoMudar();
      avisar('Não se repete mais.');
    } catch (e) {
      avisar((e as Error).message, 'erro');
    }
  }

  return (
    <Cartao>
      <div className="flex items-center justify-between border-b border-grade px-4 py-2.5">
        <Rotulo>Despesas que se repetem</Rotulo>
        {totalMes > 0 && <p className="num text-[11px] text-tinta-suave">{moeda(totalMes)} por mês</p>}
      </div>

      <div className="grid gap-2 border-b border-grade bg-papel-fundo p-3 sm:grid-cols-[1fr_9rem_6rem_7rem_auto]">
        <input
          value={nova.descricao}
          onChange={(e) => setNova({ ...nova, descricao: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && criar()}
          placeholder="Aluguel, luz, internet…"
          aria-label="O que se repete"
          className="campo"
        />
        <select
          value={nova.categoria}
          onChange={(e) => setNova({ ...nova, categoria: e.target.value })}
          aria-label="Categoria"
          className="campo"
        >
          {CATEGORIAS_DESPESA.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={nova.dia}
          onChange={(e) => setNova({ ...nova, dia: e.target.value })}
          aria-label="Dia do mês"
          className="campo num"
        >
          {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
            <option key={d} value={d}>
              dia {d}
            </option>
          ))}
        </select>
        <input
          value={nova.valor}
          onChange={(e) => setNova({ ...nova, valor: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && criar()}
          inputMode="decimal"
          placeholder="R$ 0,00"
          aria-label="Quanto custa"
          className="campo num"
        />
        <button onClick={criar} disabled={salvando} className="btn btn-principal">
          Repetir
        </button>
      </div>

      {erro ? (
        <p className="border-l-2 border-linha bg-linha-clara px-4 py-3 text-sm text-linha">
          Não consegui carregar o que se repete. O que já foi lançado continua nas despesas acima.
        </p>
      ) : fixas.length === 0 ? (
        <Vazio titulo="O que sai todo mês no mesmo dia pode entrar sozinho. Cadastre uma vez e esqueça." />
      ) : (
        <ul className="divide-y divide-grade">
          {fixas.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="num w-14 shrink-0 text-xs text-tinta-suave">dia {f.dia_do_mes}</span>
              <span className={`min-w-0 flex-1 ${f.ativa ? '' : 'text-tinta-suave line-through'}`}>
                <span className="block truncate">{f.descricao}</span>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-tinta-suave">
                  {f.categoria}
                  {!f.ativa && ' · pausada'}
                </span>
              </span>
              <span className="num w-20 shrink-0 text-right text-linha">− {moeda(f.valor_centavos)}</span>
              <span className="flex shrink-0 gap-2">
                <button onClick={() => alternar(f)} className="btn btn-secundario px-2.5 py-1 text-xs">
                  {f.ativa ? 'Pausar' : 'Voltar'}
                </button>
                <button
                  onClick={() => remover(f)}
                  aria-label={`Parar de repetir ${f.descricao}`}
                  className="rounded border border-grade px-2 py-1 text-xs text-tinta-suave hover:border-linha hover:text-linha"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-grade px-4 py-2.5 text-xs text-tinta-suave">
        Entram sozinhas quando o dia chega, e viram despesas normais: dá para corrigir o valor ou
        apagar uma delas sem mexer no resto. Quem escolhe dia 31 recebe no último dia do mês.
      </p>
    </Cartao>
  );
}
