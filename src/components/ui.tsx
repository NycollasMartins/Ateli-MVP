'use client';

import { ReactNode } from 'react';
import type { Status } from '@/lib/tipos';
import { STATUS_LABEL } from '@/lib/tipos';

export function Rotulo({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`rotulo ${className}`}>{children}</p>;
}

export function Cartao({
  children,
  className = '',
  provisorio = false,
}: {
  children: ReactNode;
  className?: string;
  provisorio?: boolean;
}) {
  return <div className={`${provisorio ? 'alinhavo' : 'cartao'} ${className}`}>{children}</div>;
}

const CORES_STATUS: Record<Status, string> = {
  novo: 'bg-linha-clara text-linha border-linha/30',
  agendado: 'bg-giz-claro text-giz border-giz/30',
  pronto: 'bg-fita/20 text-fita-escura border-fita/50',
  entregue: 'bg-mata/10 text-mata border-mata/25',
  cancelado: 'bg-papel-fundo text-tinta-suave border-grade',
};

export function Selo({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${CORES_STATUS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Vazio({ titulo, acao }: { titulo: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
        <path d="M6 34 L34 6" className="stroke-grade" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="6" cy="34" r="3" className="stroke-grade" strokeWidth="1.5" />
        <circle cx="34" cy="6" r="3" className="stroke-grade" strokeWidth="1.5" />
      </svg>
      <p className="max-w-xs text-sm text-tinta-suave">{titulo}</p>
      {acao}
    </div>
  );
}

/**
 * A lista para de atualizar sozinha quando a conexão cai. Sem este aviso, a
 * tela fica com dados velhos e parecendo certa.
 */
export function SemConexao({ erro }: { erro: string | null }) {
  // O texto do erro ("Failed to fetch") não diz nada para quem costura,
  // então ele serve só para saber que houve falha.
  if (!erro) return null;
  return (
    <div role="status" className="border-l-2 border-linha bg-linha-clara px-4 py-2.5 text-sm text-linha">
      Sem conexão com o servidor, então o que está na tela pode estar velho. Tentando de novo
      sozinho.
    </div>
  );
}

export function Linha({ className = '' }: { className?: string }) {
  return <div className={`h-px w-full bg-grade ${className}`} />;
}

export function Metrica({
  rotulo,
  valor,
  apoio,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  apoio?: string;
  destaque?: boolean;
}) {
  return (
    <div className={`px-5 py-4 ${destaque ? 'bg-mata text-papel' : ''}`}>
      <p className={`rotulo ${destaque ? 'text-papel/60' : ''}`}>{rotulo}</p>
      <p className={`num mt-2 text-2xl tracking-tight ${destaque ? 'text-papel' : 'text-tinta'}`}>{valor}</p>
      {apoio && <p className={`mt-1 text-xs ${destaque ? 'text-papel/60' : 'text-tinta-suave'}`}>{apoio}</p>}
    </div>
  );
}
