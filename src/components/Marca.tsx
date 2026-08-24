'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { MARCA_PADRAO, type Marca } from '@/lib/marca';

const Ctx = createContext<Marca>(MARCA_PADRAO);

/** A marca do ateliê para os componentes de navegador (nome nas mensagens, logo). */
export const useMarca = () => useContext(Ctx);

export function ProvedorMarca({ marca, children }: { marca: Marca; children: ReactNode }) {
  return <Ctx.Provider value={marca}>{children}</Ctx.Provider>;
}

/** Logo do ateliê, ou nada se não tiver uma. */
export function Logo({ className = '', alt }: { className?: string; alt?: string }) {
  const marca = useMarca();
  if (!marca.logo_url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={marca.logo_url} alt={alt ?? marca.nome} className={className} />;
}
