'use client';

import { ReactNode } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Cabecalho({
  titulo,
  apoio,
  acoes,
}: {
  titulo: string;
  apoio?: string;
  acoes?: ReactNode;
}) {
  return (
    <header className="sem-impressao sticky top-0 z-30 border-b border-grade bg-papel/95 px-5 py-4 backdrop-blur md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="rotulo">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          <h1 className="mt-1 font-display text-2xl leading-none tracking-tight md:text-3xl">{titulo}</h1>
          {apoio && <p className="mt-1.5 text-sm text-tinta-suave">{apoio}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2 sem-impressao">{acoes}</div>}
      </div>
    </header>
  );
}
