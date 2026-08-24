'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { addDays, format } from 'date-fns';
import type { Pedido } from '@/lib/tipos';
import { restanteDe } from '@/lib/tipos';
import { anterioresA, ordemDoPedido } from '@/lib/clientes';
import { moeda, dataLonga, linkWhats, isoDia, horaDe } from '@/lib/formato';
import { ROTULO_AVISO } from '@/lib/mensagens';
import { avisoSugerido } from '@/lib/avisos';
import { enviar } from '@/lib/dados';
import { paraCentavos, paraReais } from '@/lib/dinheiro';
import { Selo, Rotulo, Linha } from './ui';
import { BotaoWhats } from './BotaoWhats';
import { FotosDoPedido } from './FotosDoPedido';
import { useJanelaModal } from '@/lib/janela';
import { useAviso } from './Avisos';

const FORMAS = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência'];



export function PainelPedido({
  pedido,
  pedidos = [],
  aoFechar,
  aoAtualizar,
}: {
  pedido: Pedido | null;
  /** Lista completa, só para montar o histórico da cliente. */
  pedidos?: Pedido[];
  aoFechar: () => void;
  aoAtualizar: () => void;
}) {
  const avisar = useAviso();
  const janela = useJanelaModal<HTMLElement>(Boolean(pedido), aoFechar);
  const [data, setData] = useState('');
  const [hora, setHora] = useState('10:00');
  const [valor, setValor] = useState('0,00');
  const [sinal, setSinal] = useState('0,00');
  const [obs, setObs] = useState('');
  const [forma, setForma] = useState(FORMAS[0]);
  const [salvando, setSalvando] = useState(false);

  /**
   * O que ela digitou e ainda não salvou.
   *
   * A lista se atualiza sozinha a cada 12 segundos e troca o pedido aberto
   * quando ele muda no banco. Sem esta trava, a ajudante marcar a peça como
   * pronta em outra sessão — ou uma segunda aba fazer qualquer coisa —
   * reiniciava o formulário no meio da frase, e o texto sumia sem explicação.
   */
  const mexido = useRef(false);
  const idAberto = useRef<string | null>(null);
  const [mudouPorFora, setMudouPorFora] = useState(false);

  const preencher = useCallback((p: Pedido) => {
    setData(p.retirada_em ?? isoDia(addDays(new Date(), 7)));
    setHora(p.retirada_hora ?? '10:00');
    setValor(paraReais(p.valor_centavos));
    setSinal(paraReais(p.sinal_centavos));
    setObs(p.observacoes ?? '');
    setForma(p.forma_pagamento ?? FORMAS[0]);
    mexido.current = false;
    setMudouPorFora(false);
  }, []);

  useEffect(() => {
    if (!pedido) return;

    const outroPedido = idAberto.current !== pedido.id;
    idAberto.current = pedido.id;

    // mesmo pedido, mudou no banco, e ela está no meio de uma edição:
    // avisa em vez de apagar o que ela escreveu
    if (!outroPedido && mexido.current) {
      setMudouPorFora(true);
      return;
    }

    preencher(pedido);
  }, [pedido, preencher]);

  /** Marca que há coisa não salva, para o painel não passar por cima. */
  const editando =
    <T,>(guardar: (valor: T) => void) =>
    (valor: T) => {
      mexido.current = true;
      guardar(valor);
    };

  if (!pedido) return null;

  const cValor = paraCentavos(valor);
  const cSinal = paraCentavos(sinal);
  const falta = Math.max(0, cValor - cSinal);
  const sinalMaior = cSinal > cValor;

  // a decisão de qual mensagem mandar mora em src/lib/avisos.ts, junto com a
  // do cartaz da Visão geral: em dois lugares, uma delas fica para trás
  const sugestao = avisoSugerido(pedido);

  const acao = async (fn: () => Promise<unknown>, sucesso: string) => {
    setSalvando(true);
    try {
      await fn();
      mexido.current = false;
      setMudouPorFora(false);
      avisar(sucesso);
      aoAtualizar();
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setSalvando(false);
    }
  };

  const marcarRetirada = () =>
    acao(async () => {
      await enviar(`/api/admin/pedidos/${pedido.id}/agendar`, 'POST', {
        retirada_em: data,
        retirada_hora: hora,
        valor_centavos: cValor,
        sinal_centavos: cSinal,
        observacoes: obs,
      });
    }, `Retirada marcada para ${dataLonga(data)}. Já está na sua agenda.`);

  const registrarEntrega = () =>
    acao(
      () =>
        enviar(`/api/admin/pedidos/${pedido.id}`, 'PATCH', {
          status: 'entregue',
          pago: true,
          forma_pagamento: forma,
          valor_centavos: cValor,
          sinal_centavos: cSinal,
          entregue_em: new Date().toISOString(),
        }),
      cSinal > 0
        ? `Entrega registrada. Ela pagou ${moeda(falta)} agora; ${moeda(cValor)} entraram no caixa desta semana.`
        : `Entrega registrada. ${moeda(cValor)} entraram no caixa desta semana.`
    );

  const mudarStatus = (status: string, msg: string) =>
    acao(() => enviar(`/api/admin/pedidos/${pedido.id}`, 'PATCH', { status }), msg);

  /**
   * Cancelar é a ação mais destrutiva do painel: apaga o evento do Google e,
   * se o pedido já estava entregue, tira o dinheiro do caixa de uma semana que
   * talvez já esteja fechada. Não tem desfazer — e era a única ação daqui que
   * não perguntava nada.
   */
  const cancelarPedido = () => {
    const consequencias = [
      pedido.status === 'entregue'
        ? `Isso tira ${moeda(pedido.valor_centavos)} do caixa, e a semana pode já estar fechada.`
        : null,
      pedido.google_event_id ? 'O evento sai da sua agenda do Google.' : null,
      'Não dá para desfazer.',
    ].filter(Boolean);

    if (!window.confirm(`Cancelar o pedido de ${pedido.cliente_nome}?\n\n${consequencias.join('\n')}`)) {
      return;
    }
    mudarStatus('cancelado', 'Pedido cancelado e retirado da agenda.');
  };

  const itens = pedido.pedido_itens ?? [];
  const anteriores = anterioresA(pedido, pedidos);
  const vez = ordemDoPedido(pedido, pedidos);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        className="absolute inset-0 bg-mata-escuro/40"
        onClick={aoFechar}
        aria-label="Fechar detalhes do pedido"
      />
      <section
        ref={janela}
        role="dialog"
        aria-modal="true"
        aria-label={`Pedido de ${pedido.cliente_nome}`}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-grade bg-papel shadow-xl outline-none"
      >
        <header className="sticky top-0 z-10 border-b border-grade bg-papel px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="num text-[11px] text-tinta-suave">{pedido.codigo}</p>
              <h2 className="font-display text-xl leading-tight">{pedido.cliente_nome}</h2>
              <div className="mt-1.5 flex items-center gap-2">
                <Selo status={pedido.status} />
                {pedido.urgente && (
                  <span className="rounded border border-linha/30 bg-linha-clara px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-linha">
                    urgente
                  </span>
                )}
                {vez > 1 && (
                  <span className="rounded border border-fita/50 bg-fita/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fita-escura">
                    {vez}ª vez
                  </span>
                )}
              </div>
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
              href={linkWhats(
                pedido.cliente_telefone,
                `Oi ${pedido.cliente_nome.split(' ')[0]}! Aqui é do ateliê, sobre o pedido ${pedido.codigo}.`
              )}
              target="_blank"
              rel="noreferrer"
              className="num mt-1 block text-sm text-giz underline underline-offset-4"
            >
              {pedido.cliente_telefone}
            </a>
            {pedido.cliente_email && (
              <p className="text-sm text-tinta-suave">{pedido.cliente_email}</p>
            )}
          </div>

          {anteriores.length > 0 && (
            <div>
              <Rotulo>Ela já trouxe antes</Rotulo>
              <ul className="mt-2 divide-y divide-grade border border-grade">
                {anteriores.slice(0, 4).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="num w-12 shrink-0 text-[11px] text-tinta-suave">
                      {horaDe(a.criado_em).slice(0, 5)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{a.peca}</span>
                    <span className="num shrink-0 text-xs text-tinta-suave">
                      {a.valor_centavos ? moeda(a.valor_centavos) : '—'}
                    </span>
                    <Selo status={a.status} />
                  </li>
                ))}
              </ul>
              {anteriores.length > 4 && (
                <p className="mt-1.5 text-xs text-tinta-suave">
                  e mais {anteriores.length - 4} — veja tudo em Clientes.
                </p>
              )}
            </div>
          )}

          <div>
            <Rotulo>Peça</Rotulo>
            <p className="mt-1 text-sm">{pedido.peca}</p>
            {pedido.descricao && (
              <p className="mt-2 border-l-2 border-grade pl-3 text-sm text-tinta-suave">
                {pedido.descricao}
              </p>
            )}
          </div>

          {mudouPorFora && (
            <div className="border-l-2 border-fita-escura bg-fita/15 px-4 py-3">
              <p className="text-sm">
                Alguém mexeu neste pedido enquanto você escrevia. O que você digitou está aqui,
                intacto — salvar vai gravar por cima do que a outra pessoa fez.
              </p>
              <button
                onClick={() => preencher(pedido)}
                className="btn btn-secundario mt-3 px-2.5 py-1 text-xs"
              >
                Descartar o meu e ver o que ficou
              </button>
            </div>
          )}

          <FotosDoPedido pedidoId={pedido.id} />

          <div>
            <Rotulo>Serviços pedidos</Rotulo>
            <ul className="mt-2 space-y-1.5">
              {itens.length === 0 && <li className="text-sm text-tinta-suave">Nenhum serviço marcado.</li>}
              {itens.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 text-sm">
                  <span>
                    {i.nome}
                    {i.quantidade > 1 && <span className="num text-tinta-suave"> ×{i.quantidade}</span>}
                  </span>
                  <span className="num text-tinta-suave">
                    {moeda(i.preco_unit_centavos * i.quantidade)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Linha />

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="rotulo" htmlFor="valor">
                  Valor a cobrar
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-tinta-suave">R$</span>
                  <input
                    id="valor"
                    value={valor}
                    onChange={(e) => editando(setValor)(e.target.value)}
                    inputMode="decimal"
                    className="campo num"
                  />
                </div>
              </div>
              <div>
                <label className="rotulo" htmlFor="sinal">
                  Sinal deixado
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-tinta-suave">R$</span>
                  <input
                    id="sinal"
                    value={sinal}
                    onChange={(e) => editando(setSinal)(e.target.value)}
                    inputMode="decimal"
                    className="campo num"
                  />
                </div>
              </div>
            </div>

            {sinalMaior ? (
              <p className="border-l-2 border-linha bg-linha-clara px-3 py-2 text-sm text-linha">
                O sinal está maior que o valor a cobrar. Confira os dois números.
              </p>
            ) : (
              cSinal > 0 && (
                <p className="border-l-2 border-fita bg-fita/15 px-3 py-2 text-sm">
                  Ela já deixou <span className="num">{moeda(cSinal)}</span>. Falta receber{' '}
                  <span className="num">{moeda(falta)}</span> na retirada.
                </p>
              )
            )}

            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <div>
                <label className="rotulo" htmlFor="data">
                  Dia da retirada
                </label>
                <input
                  id="data"
                  type="date"
                  value={data}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => editando(setData)(e.target.value)}
                  className="campo num mt-1"
                />
              </div>
              <div>
                <label className="rotulo" htmlFor="hora">
                  Hora
                </label>
                <input
                  id="hora"
                  type="time"
                  value={hora}
                  onChange={(e) => editando(setHora)(e.target.value)}
                  className="campo num mt-1"
                />
              </div>
            </div>

            <div>
              <label className="rotulo" htmlFor="obs">
                Suas anotações
              </label>
              <textarea
                id="obs"
                rows={3}
                value={obs}
                onChange={(e) => editando(setObs)(e.target.value)}
                placeholder="Medidas, tecido, o que combinaram na conversa…"
                className="campo mt-1 resize-y"
              />
            </div>

            <button
              onClick={marcarRetirada}
              disabled={salvando || !data || sinalMaior}
              className="btn btn-principal w-full"
            >
              {pedido.status === 'novo' ? 'Marcar retirada e enviar para a agenda' : 'Salvar e atualizar a agenda'}
            </button>
            <p className="text-xs text-tinta-suave">
              O evento vai para o Google Agenda com os dados da cliente e avisa você 3 dias antes e 24 horas antes.
            </p>

            {sugestao && (
              <>
                <Linha />
                <BotaoWhats
                  pedido={pedido}
                  tipo={sugestao.tipo}
                  rotulo={ROTULO_AVISO[sugestao.tipo]}
                  aoAvisar={aoAtualizar}
                  mostrarTexto
                />
              </>
            )}
          </div>

          {pedido.status !== 'novo' && pedido.status !== 'entregue' && (
            <>
              <Linha />
              <div className="space-y-3">
                <Rotulo>Quando ela retirar</Rotulo>
                <select
                  value={forma}
                  onChange={(e) => editando(setForma)(e.target.value)}
                  aria-label="Forma de pagamento"
                  className="campo"
                >
                  {FORMAS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
                <button
                  onClick={registrarEntrega}
                  disabled={salvando || sinalMaior}
                  className="btn btn-principal w-full"
                >
                  {cSinal > 0 ? `Receber ${moeda(falta)} e entregar` : 'Registrar entrega e pagamento'}
                </button>
                {pedido.status !== 'pronto' && (
                  <button
                    onClick={() => mudarStatus('pronto', 'Peça marcada como pronta.')}
                    disabled={salvando}
                    className="btn btn-secundario w-full"
                  >
                    Marcar peça como pronta
                  </button>
                )}
              </div>
            </>
          )}

          {pedido.status === 'entregue' && (
            <div className="border border-mata/20 bg-mata/5 px-4 py-3 text-sm">
              Entregue e recebido: <span className="num">{moeda(pedido.valor_centavos)}</span>
              {pedido.forma_pagamento && <> em {pedido.forma_pagamento.toLowerCase()}</>}.
              {pedido.sinal_centavos > 0 && (
                <span className="mt-1 block text-tinta-suave">
                  <span className="num">{moeda(pedido.sinal_centavos)}</span> de sinal +{' '}
                  <span className="num">{moeda(restanteDe(pedido))}</span> na retirada.
                </span>
              )}
            </div>
          )}

          {pedido.status !== 'cancelado' && (
            <button
              onClick={cancelarPedido}
              disabled={salvando}
              className="btn btn-perigo w-full"
            >
              Cancelar pedido
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
