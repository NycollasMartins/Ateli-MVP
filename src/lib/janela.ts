'use client';

import { useCallback, useEffect, useRef } from 'react';

const FOCAVEIS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const visivel = (e: HTMLElement) => e.offsetWidth > 0 || e.offsetHeight > 0;

/**
 * Comportamento de janela que abre por cima (o painel do pedido, a ficha da
 * cliente, a foto ampliada).
 *
 * Sem isto, quem usa teclado abre o painel e o foco continua atrás dele: é
 * preciso tabular pela página inteira para chegar aos campos, e ao fechar o
 * foco se perde e recomeça do topo.
 *
 * Devolve a referência para pôr na caixa da janela, que precisa de
 * `tabIndex={-1}` para poder receber o foco.
 */
export function useJanelaModal<T extends HTMLElement>(aberta: boolean, aoFechar: () => void) {
  const caixa = useRef<T>(null);

  /**
   * O `aoFechar` costuma ser uma função nova a cada render (`() => setX(null)`).
   * Guardá-lo numa referência evita o efeito rodar de novo a cada tecla
   * digitada — o que devolveria o foco ao começo e impediria de escrever.
   */
  const fechar = useRef(aoFechar);
  useEffect(() => {
    fechar.current = aoFechar;
  });

  const focaveis = useCallback(
    () => [...(caixa.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? [])].filter(visivel),
    []
  );

  useEffect(() => {
    if (!aberta) return;

    const anterior = document.activeElement as HTMLElement | null;
    (focaveis()[0] ?? caixa.current)?.focus();

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        fechar.current();
        return;
      }
      if (e.key !== 'Tab') return;

      // o Tab dá a volta dentro da janela em vez de escapar para a página atrás
      const itens = focaveis();
      if (itens.length === 0) return;

      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      const atual = document.activeElement;

      if (e.shiftKey && (atual === primeiro || !caixa.current?.contains(atual))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && atual === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      // devolve o foco a quem abriu a janela
      anterior?.focus?.();
    };
  }, [aberta, focaveis]);

  return caixa;
}
