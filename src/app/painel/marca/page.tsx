'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { enviar, irParaLogin } from '@/lib/dados';
import {
  CORES_PADRAO,
  ROTULO_COR,
  cssDaMarca,
  normalizarHex,
  avisoDeContraste,
  type Cores,
  type Marca,
} from '@/lib/marca';
import { Cabecalho } from '@/components/Cabecalho';
import { Cartao, Rotulo, Linha } from '@/components/ui';
import { useAviso } from '@/components/Avisos';

const CHAVES = Object.keys(CORES_PADRAO) as (keyof Cores)[];

export default function MarcaDoAtelie() {
  const avisar = useAviso();
  const [marca, setMarca] = useState<Marca | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erro, setErro] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  const recarregar = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/marca', { cache: 'no-store' });
      if (r.status === 401) return irParaLogin();
      const { marca: m } = await r.json();
      setMarca(m);
      setErro(false);
    } catch {
      // sem isto a tela ficava em "Carregando…" para sempre
      setErro(true);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  /**
   * Enquanto mexe nos seletores, as variáveis desta página mudam junto —
   * a tela inteira vira a prévia, sem precisar de um quadradinho de exemplo.
   */
  useEffect(() => {
    if (!marca) return;
    const estilo = document.createElement('style');
    estilo.textContent = cssDaMarca(marca.cores);
    document.head.appendChild(estilo);
    return () => estilo.remove();
  }, [marca]);

  if (!marca) {
    return (
      <>
        <Cabecalho titulo="Marca" />
        {erro ? (
          <p className="mx-5 mt-6 border-l-2 border-linha bg-linha-clara px-4 py-3 text-sm text-linha md:mx-8">
            Não consegui carregar a marca do ateliê. Nada foi perdido — recarregue a página.
          </p>
        ) : (
          <p className="px-5 py-10 text-sm text-tinta-suave md:px-8">Carregando…</p>
        )}
      </>
    );
  }

  const mudarCor = (chave: keyof Cores, valor: string) =>
    setMarca({ ...marca, cores: { ...marca.cores, [chave]: valor } });

  async function salvar() {
    setSalvando(true);
    try {
      const { marca: salva } = await enviar<{ marca: Marca }>('/api/admin/marca', 'PUT', marca);
      setMarca(salva);
      avisar('Marca salva. Recarregue para ver em todas as telas.');
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function voltarAoPadrao() {
    if (!window.confirm('Voltar às cores originais do sistema?')) return;
    try {
      const { marca: salva } = await enviar<{ marca: Marca }>('/api/admin/marca', 'DELETE');
      setMarca(salva);
      avisar('Cores de volta ao original.');
    } catch (e) {
      avisar((e as Error).message, 'erro');
    }
  }

  async function enviarLogo(arquivos: FileList | null) {
    const f = arquivos?.[0];
    if (!f) return;
    setEnviandoLogo(true);
    try {
      const corpo = new FormData();
      corpo.append('logo', f);
      const r = await fetch('/api/admin/marca/logo', { method: 'POST', body: corpo });
      const dados = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(dados.erro ?? 'Não deu certo. Tente de novo.');
      setMarca({ ...marca!, logo_url: dados.logo_url });
      avisar('Logo enviado.');
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setEnviandoLogo(false);
      if (arquivo.current) arquivo.current.value = '';
    }
  }

  async function tirarLogo() {
    if (!window.confirm('Tirar o logo do ateliê?')) return;
    try {
      await enviar('/api/admin/marca/logo', 'DELETE');
      setMarca({ ...marca!, logo_url: null });
      avisar('Logo removido.');
    } catch (e) {
      avisar((e as Error).message, 'erro');
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Marca"
        apoio="Nome, cores e logo deste ateliê. Vale para o painel, para o formulário do QR e para o cartaz impresso."
        acoes={
          <button onClick={salvar} disabled={salvando} className="btn btn-principal">
            Salvar marca
          </button>
        }
      />

      <div className="space-y-5 px-5 py-6 md:px-8">
        <Cartao>
          <div className="border-b border-grade px-4 py-2.5">
            <Rotulo>Nome do ateliê</Rotulo>
          </div>
          <div className="p-4">
            <input
              value={marca.nome}
              onChange={(e) => setMarca({ ...marca, nome: e.target.value })}
              maxLength={60}
              aria-label="Nome do ateliê"
              className="campo max-w-sm"
            />
            <p className="mt-2 text-xs text-tinta-suave">
              Aparece no menu, na aba do navegador, no formulário da cliente e nas mensagens de
              WhatsApp.
            </p>
          </div>
        </Cartao>

        <Cartao>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-grade px-4 py-2.5">
            <Rotulo>Cores</Rotulo>
            <button onClick={voltarAoPadrao} className="text-[11px] text-giz underline underline-offset-4">
              voltar ao original
            </button>
          </div>
          <div className="divide-y divide-grade">
            {CHAVES.map((chave) => (
              <div key={chave} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <input
                  type="color"
                  value={normalizarHex(marca.cores[chave], CORES_PADRAO[chave])}
                  onChange={(e) => mudarCor(chave, e.target.value)}
                  aria-label={`Cor ${ROTULO_COR[chave].nome}`}
                  className="h-9 w-12 shrink-0 cursor-pointer rounded border border-grade bg-papel p-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{ROTULO_COR[chave].nome}</p>
                  <p className="text-xs text-tinta-suave">{ROTULO_COR[chave].explica}</p>
                </div>
                <input
                  value={marca.cores[chave]}
                  onChange={(e) => mudarCor(chave, e.target.value)}
                  aria-label={`Código da cor ${ROTULO_COR[chave].nome}`}
                  className="campo num w-28 shrink-0 uppercase"
                />

                {(() => {
                  const aviso = avisoDeContraste(chave, marca.cores[chave]);
                  return aviso ? (
                    <p className="w-full border-l-2 border-linha pl-3 text-xs text-linha">{aviso}</p>
                  ) : null;
                })()}
              </div>
            ))}
          </div>
          <p className="border-t border-grade px-4 py-2.5 text-xs text-tinta-suave">
            A tela já muda enquanto você escolhe. O papel, a grade e a cor do texto não mudam de
            ateliê para ateliê: são o que mantém tudo legível.
          </p>
        </Cartao>

        <Cartao>
          <div className="border-b border-grade px-4 py-2.5">
            <Rotulo>Logo</Rotulo>
          </div>
          <div className="flex flex-wrap items-center gap-5 p-4">
            <div className="flex h-20 w-40 shrink-0 items-center justify-center border border-dashed border-grade bg-papel-fundo">
              {marca.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={marca.logo_url} alt="Logo do ateliê" className="max-h-16 max-w-36" />
              ) : (
                <span className="text-xs text-tinta-suave">sem logo</span>
              )}
            </div>
            <div className="min-w-48 flex-1">
              <input
                ref={arquivo}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => enviarLogo(e.target.files)}
                disabled={enviandoLogo}
                aria-label="Arquivo do logo"
                className="campo"
              />
              <p className="mt-2 text-xs text-tinta-suave">
                PNG, JPG, WEBP ou SVG, até 1 MB. Fundo transparente fica melhor, porque o logo
                aparece sobre o verde do menu e sobre o papel do cartaz.
              </p>
              {marca.logo_url && (
                <button onClick={tirarLogo} className="btn btn-perigo mt-3 px-2.5 py-1 text-xs">
                  Tirar logo
                </button>
              )}
            </div>
          </div>
          <Linha />
          <p className="px-4 py-2.5 text-xs text-tinta-suave">
            O logo vale na hora, sem precisar salvar. Nome e cores só valem depois de
            <strong> Salvar marca</strong>.
          </p>
        </Cartao>
      </div>
    </>
  );
}
