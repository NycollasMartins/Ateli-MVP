'use client';

import { createContext, useContext } from 'react';
import type { Papel } from '@/lib/acesso';

/**
 * O papel de quem está logado, disponível para as telas do painel.
 *
 * Quem decide é o servidor: o valor entra uma vez no layout e desce por aqui.
 * Serve só para não oferecer o que a pessoa não pode abrir — a trava de
 * verdade é o `src/proxy.ts` e a conferência de cada rota de `/api/admin`.
 */
const Contexto = createContext<Papel>('funcionario');

export const ProvedorPapel = ({ papel, children }: { papel: Papel; children: React.ReactNode }) => (
  <Contexto.Provider value={papel}>{children}</Contexto.Provider>
);

export const usePapel = () => useContext(Contexto);

export const useEhAdmin = () => useContext(Contexto) === 'admin';
