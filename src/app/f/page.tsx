'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useServicos, enviar } from '@/lib/dados';
import { moeda } from '@/lib/formato';
import { PECAS, acrescimoDaPressa, type UrgentePerfil } from '@/lib/tipos';
import { useMarca, Logo } from '@/components/Marca';
import { ACCEPT, MAXIMO_CLIENTE, TAMANHO_MAXIMO, tipoAceito } from '@/lib/fotos';
import { reduzirFoto } from '@/lib/imagem';
import { PerguntaDaPressa } from '@/components/PerguntaDaPressa';


export default function FormularioPublico() {
  const marca = useMarca();
  const { servicos, carregando, erro: erroServicos } = useServicos(true);
  const [escolhidos, setEscolhidos] = useState<Record<string, number>>({});
  const [dados, setDados] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    cliente_ramal: '',
    peca: '',
    descricao: '',
    urgente: false,
    urgente_perfil: null as UrgentePerfil | null,
  });
  const [fotos, setFotos] = useState<File[]>([]);
  const [preparando, setPreparando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<{ codigo: string; valor: number; acrescimo: number } | null>(null);
  const [perguntandoPressa, setPerguntandoPressa] = useState(false);

  const categorias = useMemo(() => {
    const mapa = new Map<string, typeof servicos>();
    servicos.forEach((s) => mapa.set(s.categoria, [...(mapa.get(s.categoria) ?? []), s]));
    return [...mapa.entries()];
  }, [servicos]);

  /** O que a pressa acrescenta a este pedido, do jeito que o servidor vai calcular. */
  const acrescimo = acrescimoDaPressa(dados.urgente, dados.urgente_perfil);

  const recadoDaPressa = !dados.urgente
    ? 'A costureira confirma se dá tempo.'
    : acrescimo
      ? `Com acréscimo de ${moeda(acrescimo)} pela prioridade.`
      : 'Sem acréscimo: você tem prioridade por direito.';

  const total = useMemo(
    () =>
      Object.entries(escolhidos).reduce((soma, [id, qtd]) => {
        const s = servicos.find((x) => x.id === id);
        return soma + (s ? s.preco_centavos * qtd : 0);
      }, 0),
    [escolhidos, servicos]
  );

  /**
   * Encolhe na hora de escolher, não na hora de enviar.
   *
   * A câmera boa do celular produz foto de 6 a 8 MB — justo as melhores. Se o
   * limite de 5 MB fosse conferido antes de encolher, elas seriam recusadas
   * com "passa de 5 MB", e depois de reduzidas teriam 300 KB.
   *
   * De quebra, a espera acontece enquanto ela ainda preenche o formulário, e
   * não depois de tocar em enviar.
   */
  async function escolherFotos(lista: FileList | null) {
    if (!lista?.length) return;
    setPreparando(true);

    const aceitas: File[] = [];
    const recusadas: string[] = [];

    for (const original of Array.from(lista)) {
      if (!tipoAceito(original.type)) {
        recusadas.push(`${original.name}: só JPG, PNG ou WEBP`);
        continue;
      }

      const f = await reduzirFoto(original);
      // só recusa o que continua enorme depois de encolhida
      if (f.size > TAMANHO_MAXIMO) recusadas.push(`${original.name}: grande demais`);
      else aceitas.push(f);
    }

    setPreparando(false);
    setErro(recusadas.length ? recusadas.join(' · ') : null);
    setFotos((atuais) => [...atuais, ...aceitas].slice(0, MAXIMO_CLIENTE));
  }

  const tirarFoto = (i: number) => setFotos((f) => f.filter((_, j) => j !== i));

  // as prévias são criadas uma vez por lista de fotos, não a cada tecla digitada,
  // e devolvidas ao navegador quando a lista muda
  const previas = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos]);
  useEffect(() => () => previas.forEach((u) => URL.revokeObjectURL(u)), [previas]);

  const alternar = (id: string) =>
    setEscolhidos((e) => {
      const copia = { ...e };
      if (copia[id]) delete copia[id];
      else copia[id] = 1;
      return copia;
    });

  async function submeter(e: React.SyntheticEvent) {
    e.preventDefault();
    // o Enter num campo dispara o envio, e o botão desabilitado não segura isso:
    // sem esta trava, dois Enter seguidos viravam dois pedidos
    if (enviando || preparando) return;
    setErro(null);
    setEnviando(true);
    try {
      const r = await enviar<{ id: string; codigo: string; valor_centavos: number; acrescimo_centavos: number }>(
        '/api/publico/pedidos',
        'POST',
        {
          ...dados,
          itens: Object.entries(escolhidos).map(([servico_id, quantidade]) => ({ servico_id, quantidade })),
        }
      );

      // o pedido já está salvo: se a foto falhar, não vale perder o resto
      if (fotos.length) {
        try {
          const corpo = new FormData();
          fotos.forEach((f) => corpo.append('fotos', f));
          await fetch(`/api/publico/pedidos/${r.id}/fotos`, { method: 'POST', body: corpo });
        } catch {
          /* a costureira pede a foto no WhatsApp */
        }
      }

      setPronto({ codigo: r.codigo, valor: r.valor_centavos, acrescimo: r.acrescimo_centavos });
      window.scrollTo({ top: 0 });
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (pronto) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-papel-fundo px-5 py-12">
        <div className="papel-molde w-full max-w-md border border-grade p-8 text-center">
          <p className="rotulo">Pedido recebido</p>
          <p className="num mt-4 text-4xl tracking-tight">{pronto.codigo}</p>
          <p className="mt-2 text-sm text-tinta-suave">Anote ou tire uma foto deste código.</p>
          <div className="my-6 h-px w-full border-t border-dashed border-tinta/25" />
          <p className="text-sm leading-relaxed">
            A costureira já viu seu pedido na tela dela. Ela vai marcar o dia da retirada e te chamar no
            WhatsApp que você deixou.
          </p>
          {pronto.valor > 0 && (
            <p className="num mt-4 text-sm">
              Estimativa pela tabela: <strong>{moeda(pronto.valor)}</strong>
            </p>
          )}
          {pronto.acrescimo > 0 && (
            <p className="mt-1 text-xs text-tinta-suave">
              Já inclui <span className="num">{moeda(pronto.acrescimo)}</span> pela prioridade.
            </p>
          )}
          <button
            onClick={() => {
              setPronto(null);
              setEscolhidos({});
              setFotos([]);
              setDados({
                cliente_nome: '',
                cliente_telefone: '',
                cliente_ramal: '',
                peca: '',
                descricao: '',
                urgente: false,
                urgente_perfil: null,
              });
            }}
            className="btn btn-secundario mt-7 w-full"
          >
            Deixar outra peça
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-papel-fundo pb-28">
      <header className="base-corte px-5 py-8 text-papel">
        <div className="mx-auto max-w-lg">
          <Logo className="mb-3 h-10 w-auto" />
          <p className="rotulo text-papel/50">Deixe sua peça</p>
          <h1 className="mt-1.5 font-display text-3xl leading-tight">{marca.nome}</h1>
          <p className="mt-2 max-w-sm text-sm text-papel/70">
            Preencha enquanto está aqui. Leva um minuto e você sai já sabendo que está anotado.
          </p>
        </div>
      </header>

      <form id="pedido" onSubmit={submeter} className="mx-auto max-w-lg px-5">
        <section className="papel-molde -mt-4 border border-grade px-6 py-7">
          <p className="rotulo">Quem é você</p>

          <div className="mt-4 space-y-5">
            <div>
              <label htmlFor="nome" className="text-sm">
                Nome completo
              </label>
              <input
                id="nome"
                required
                value={dados.cliente_nome}
                maxLength={120}
                onChange={(e) => setDados({ ...dados, cliente_nome: e.target.value })}
                className="campo-papel"
                placeholder="Maria Aparecida Souza"
              />
            </div>
            <div>
              <label htmlFor="tel" className="text-sm">
                WhatsApp com DDD
              </label>
              <input
                id="tel"
                required
                inputMode="tel"
                value={dados.cliente_telefone}
                maxLength={30}
                onChange={(e) => setDados({ ...dados, cliente_telefone: e.target.value })}
                className="campo-papel num"
                placeholder="(61) 99999-0000"
              />
            </div>
            <div>
              <label htmlFor="ramal" className="text-sm">
                Ramal <span className="text-tinta-suave">(se quiser)</span>
              </label>
              <input
                id="ramal"
                inputMode="numeric"
                value={dados.cliente_ramal}
                maxLength={10}
                onChange={(e) => setDados({ ...dados, cliente_ramal: e.target.value.replace(/\D/g, '') })}
                className="campo-papel num"
                placeholder="4231"
              />
              <p className="mt-1 text-xs text-tinta-suave">Facilita achar você aqui dentro.</p>
            </div>
          </div>
        </section>

        <section className="papel-molde mt-4 border border-grade px-6 py-7">
          <p className="rotulo">A peça</p>
          <div className="mt-4 space-y-5">
            <div>
              <label htmlFor="peca" className="text-sm">
                O que você está deixando
              </label>
              <select
                id="peca"
                required
                value={dados.peca}
                onChange={(e) => setDados({ ...dados, peca: e.target.value })}
                className="campo-papel"
              >
                <option value="">Escolha…</option>
                {PECAS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="descricao" className="text-sm">
                O que você quer que seja feito
              </label>
              <textarea
                id="descricao"
                rows={3}
                value={dados.descricao}
                maxLength={2000}
                onChange={(e) => setDados({ ...dados, descricao: e.target.value })}
                className="campo-papel resize-y"
                placeholder="Ex.: barra da calça preta, marcar no comprimento do sapato que trouxe."
              />
            </div>

            <div>
              <p className="text-sm">Foto da peça (opcional)</p>
              <p className="mt-0.5 text-xs text-tinta-suave">
                Ajuda a costureira a já saber o que vem. Até {MAXIMO_CLIENTE}.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {fotos.map((_, i) => (
                  <span key={i} className="relative h-20 w-20 overflow-hidden border border-tinta/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previas[i]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => tirarFoto(i)}
                      aria-label={`Tirar a foto ${i + 1}`}
                      className="absolute right-0 top-0 bg-linha px-1.5 py-0.5 text-xs leading-none text-papel"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {fotos.length < MAXIMO_CLIENTE && (
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-tinta/30 text-tinta-suave hover:border-giz hover:text-giz">
                    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                      <rect x="1.5" y="4.5" width="15" height="11" />
                      <circle cx="9" cy="10" r="3" />
                      <path d="M6 4.5 7 2.5h4l1 2" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[10px]">{preparando ? 'um instante…' : 'foto'}</span>
                    <input
                      type="file"
                      accept={ACCEPT}
                      capture="environment"
                      multiple
                      onChange={(e) => escolherFotos(e.target.files)}
                      aria-label="Escolher foto da peça"
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="papel-molde mt-4 border border-grade px-6 py-7">
          <div className="flex items-baseline justify-between gap-3">
            <p className="rotulo">Serviços</p>
            <Link href="/f/precos" className="text-xs text-giz underline underline-offset-4">
              Ver a tabela toda
            </Link>
          </div>
          <p className="mt-1 text-xs text-tinta-suave">
            Marque o que precisa. Se não souber, deixe em branco: a costureira confere na hora.
          </p>

          {carregando && <p className="mt-5 text-sm text-tinta-suave">Carregando a tabela…</p>}

          {!carregando && erroServicos && (
            <p className="mt-5 border-l-2 border-linha pl-3 text-sm">
              Não conseguimos carregar a lista de serviços agora. Pode deixar sua peça assim
              mesmo: a costureira confere o valor com você.
            </p>
          )}

          {!carregando && !erroServicos && categorias.length === 0 && (
            <p className="mt-5 border-l-2 border-grade pl-3 text-sm text-tinta-suave">
              Nenhum serviço cadastrado ainda. Descreva acima o que precisa e a costureira
              confere o valor com você.
            </p>
          )}

          <div className="mt-5 space-y-6">
            {categorias.map(([categoria, lista]) => (
              <div key={categoria}>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-tinta-suave">
                  {categoria}
                </p>
                <ul className="mt-2 divide-y divide-grade border-y border-grade">
                  {lista.map((s) => {
                    const marcado = Boolean(escolhidos[s.id]);
                    return (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-center gap-3 py-3">
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => alternar(s.id)}
                            className="h-4 w-4 accent-mata"
                          />
                          <span className="flex-1 text-sm leading-snug">
                            {s.nome}
                            {s.descricao && (
                              <span className="block text-xs text-tinta-suave">{s.descricao}</span>
                            )}
                          </span>
                          <span className="num shrink-0 text-sm">
                            {s.preco_centavos ? moeda(s.preco_centavos) : 'a combinar'}
                          </span>
                        </label>
                        {marcado && s.preco_centavos > 0 && (
                          <div className="flex items-center gap-2 pb-3 pl-7">
                            <span className="text-xs text-tinta-suave">Quantas peças?</span>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={escolhidos[s.id]}
                              aria-label={`Quantas peças de ${s.nome}`}
                              onChange={(e) =>
                                setEscolhidos({ ...escolhidos, [s.id]: Math.max(1, Number(e.target.value)) })
                              }
                              className="campo num w-16 py-1"
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <label className="mt-6 flex items-start gap-3 border border-dashed border-linha/50 bg-linha-clara/40 px-4 py-3">
            {/* marcar abre a pergunta em vez de marcar direto: ninguém aceita um
                acréscimo sem antes saber que ele existe */}
            <input
              type="checkbox"
              checked={dados.urgente}
              onChange={(e) =>
                e.target.checked
                  ? setPerguntandoPressa(true)
                  : setDados({ ...dados, urgente: false, urgente_perfil: null })
              }
              className="mt-0.5 h-4 w-4 accent-linha"
            />
            <span className="text-sm leading-snug">
              Preciso com pressa
              <span className="block text-xs text-tinta-suave">{recadoDaPressa}</span>
            </span>
          </label>
        </section>

        {erro && (
          <p className="mt-4 border-l-2 border-linha bg-linha-clara px-4 py-3 text-sm text-linha">{erro}</p>
        )}

        <button type="submit" disabled={enviando || preparando} className="sr-only" tabIndex={-1} aria-hidden>
          Enviar pedido
        </button>

        <p className="mt-5 text-center text-xs leading-relaxed text-tinta-suave">
          Seus dados são usados só para avisar sobre esta peça.
        </p>
      </form>

      {perguntandoPressa && (
        <PerguntaDaPressa
          aoResponder={(perfil) => {
            setDados({ ...dados, urgente: true, urgente_perfil: perfil });
            setPerguntandoPressa(false);
          }}
          // fechar sem responder deixa a opção desmarcada, como estava
          aoDesistir={() => {
            setDados({ ...dados, urgente: false, urgente_perfil: null });
            setPerguntandoPressa(false);
          }}
        />
      )}

      {/* fita de total, fixa no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 border-t-2 border-fita-escura/40 bg-fita">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4 px-5 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-tinta/60">Estimativa</p>
            <p className="num text-lg leading-tight text-tinta">
              {total || acrescimo ? moeda(total + acrescimo) : 'a combinar'}
            </p>
            {acrescimo > 0 && (
              <p className="text-[11px] leading-tight text-tinta/70">
                inclui {moeda(acrescimo)} da pressa
              </p>
            )}
          </div>
          {/* `form` liga o botão ao formulário mesmo estando fora dele, na fita
              do rodapé. Sem isso o navegador não checa os campos obrigatórios
              e ela só descobre o que faltou depois da viagem ao servidor. */}
          <button
            type="submit"
            form="pedido"
            disabled={enviando || preparando}
            className="btn border-mata bg-mata px-6 text-papel hover:bg-mata-escuro"
          >
            {enviando ? 'Enviando…' : preparando ? 'Preparando a foto…' : 'Enviar pedido'}
          </button>
        </div>
      </div>
    </main>
  );
}
