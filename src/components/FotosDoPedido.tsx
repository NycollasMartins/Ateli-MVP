'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ACCEPT, MAXIMO_POR_PEDIDO, type Foto } from '@/lib/fotos';
import { irParaLogin } from '@/lib/dados';
import { useJanelaModal } from '@/lib/janela';
import { reduzirFoto } from '@/lib/imagem';
import { Rotulo } from './ui';
import { useAviso } from './Avisos';

/**
 * As fotos da peça. As URLs são assinadas e vencem, então são buscadas quando
 * o painel abre, e não junto com a lista de pedidos.
 */
export function FotosDoPedido({ pedidoId }: { pedidoId: string }) {
  const avisar = useAviso();
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [ampliada, setAmpliada] = useState<Foto | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/admin/pedidos/${pedidoId}/fotos`, { cache: 'no-store' });
      if (r.status === 401) return irParaLogin();
      const { fotos: lista } = await r.json();
      setFotos(lista ?? []);
    } catch {
      setFotos([]);
    } finally {
      setCarregando(false);
    }
  }, [pedidoId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const janela = useJanelaModal<HTMLDivElement>(Boolean(ampliada), () => setAmpliada(null));

  async function mandar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setEnviando(true);
    try {
      const corpo = new FormData();
      // encolhe antes de subir: foto de celular tem 3 a 6 MB, e ela está com a
      // cliente esperando em pé
      const menores = await Promise.all(Array.from(arquivos).map(reduzirFoto));
      menores.forEach((f) => corpo.append('fotos', f));
      const r = await fetch(`/api/admin/pedidos/${pedidoId}/fotos`, { method: 'POST', body: corpo });
      const dados = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(dados.erro ?? 'Não deu certo. Tente de novo.');
      setFotos(dados.fotos ?? []);
      avisar(arquivos.length === 1 ? 'Foto guardada.' : `${arquivos.length} fotos guardadas.`);
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = '';
    }
  }

  async function apagar(foto: Foto) {
    if (!window.confirm('Apagar esta foto?')) return;
    try {
      const r = await fetch(`/api/admin/pedidos/${pedidoId}/fotos?foto=${foto.id}`, {
        method: 'DELETE',
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro ?? 'Não deu certo.');
      setFotos((f) => f.filter((x) => x.id !== foto.id));
      setAmpliada(null);
    } catch (e) {
      avisar((e as Error).message, 'erro');
    }
  }

  const cheio = fotos.length >= MAXIMO_POR_PEDIDO;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Rotulo>Fotos da peça</Rotulo>
        {fotos.length > 0 && (
          <span className="num text-[11px] text-tinta-suave">
            {fotos.length} de {MAXIMO_POR_PEDIDO}
          </span>
        )}
      </div>

      {carregando ? (
        <p className="mt-2 text-sm text-tinta-suave">Carregando…</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {fotos.map((foto) => (
            <button
              key={foto.id}
              onClick={() => setAmpliada(foto)}
              title={foto.origem === 'cliente' ? 'Mandada pela cliente' : 'Tirada no ateliê'}
              className="relative h-20 w-20 overflow-hidden border border-grade bg-papel-fundo hover:border-tinta-suave"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.url} alt="Foto da peça" className="h-full w-full object-cover" />
              {foto.origem === 'cliente' && (
                <span className="absolute bottom-0 left-0 right-0 bg-mata/80 py-0.5 font-mono text-[8px] uppercase tracking-wider text-papel">
                  cliente
                </span>
              )}
            </button>
          ))}

          {!cheio && (
            <button
              onClick={() => entrada.current?.click()}
              disabled={enviando}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 border border-dashed border-grade text-tinta-suave hover:border-tinta-suave disabled:opacity-40"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                <rect x="1.5" y="4.5" width="15" height="11" />
                <circle cx="9" cy="10" r="3" />
                <path d="M6 4.5 7 2.5h4l1 2" strokeLinejoin="round" />
              </svg>
              <span className="text-[10px]">{enviando ? 'enviando…' : 'tirar foto'}</span>
            </button>
          )}
        </div>
      )}

      <input
        ref={entrada}
        type="file"
        accept={ACCEPT}
        capture="environment"
        multiple
        onChange={(e) => mandar(e.target.files)}
        className="sr-only"
        aria-label="Adicionar foto da peça"
      />

      {!carregando && fotos.length === 0 && (
        <p className="mt-2 text-xs text-tinta-suave">
          Uma foto na chegada evita discussão na entrega.
        </p>
      )}

      {ampliada && (
        <div
          ref={janela}
          role="dialog"
          aria-modal="true"
          aria-label="Foto da peça, ampliada"
          tabIndex={-1}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-mata-escuro/80 p-5 outline-none"
        >
          <button
            className="absolute inset-0"
            onClick={() => setAmpliada(null)}
            aria-label="Fechar foto"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ampliada.url}
            alt="Foto da peça"
            className="relative max-h-[75vh] max-w-full border-4 border-papel object-contain"
          />
          <div className="relative mt-3 flex gap-2">
            <button onClick={() => setAmpliada(null)} className="btn btn-secundario">
              Fechar
            </button>
            <button onClick={() => apagar(ampliada)} className="btn btn-perigo">
              Apagar foto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
