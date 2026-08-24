'use client';

import type { Pedido } from '@/lib/tipos';
import { restanteDe } from '@/lib/tipos';
import { moeda } from '@/lib/formato';
import { type TipoAviso } from '@/lib/mensagens';
import { pendenciasDeAviso } from '@/lib/avisos';
import { Cartao } from './ui';
import { BotaoWhats } from './BotaoWhats';

const ROTULO_CURTO: Record<TipoAviso, string> = {
  marcada: 'Mandar a data',
  vespera: 'Lembrar que é amanhã',
  pronta: 'Avisar que está pronta',
  atrasada: 'Chamar para buscar',
};

export function AvisarClientes({
  pedidos,
  aoAvisar,
}: {
  pedidos: Pedido[];
  aoAvisar: () => void;
}) {
  const pendentes = pendenciasDeAviso(pedidos);
  if (pendentes.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="rotulo">Falta avisar no WhatsApp</p>
        <p className="num text-[11px] text-tinta-suave">{pendentes.length}</p>
      </div>
      <Cartao>
        <ul className="divide-y divide-grade">
          {pendentes.slice(0, 8).map(({ pedido, tipo, motivo }) => (
            <li
              key={`${pedido.id}-${tipo}`}
              className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{pedido.cliente_nome}</p>
                <p className="truncate text-xs text-tinta-suave">
                  {pedido.peca} · {motivo}
                  {restanteDe(pedido) > 0 && (
                    <>
                      {' · falta '}
                      <span className="num">{moeda(restanteDe(pedido))}</span>
                    </>
                  )}
                </p>
              </div>
              <BotaoWhats
                pedido={pedido}
                tipo={tipo}
                rotulo={ROTULO_CURTO[tipo]}
                aoAvisar={aoAvisar}
                className="w-full shrink-0 sm:w-56"
              />
            </li>
          ))}
        </ul>
        {pendentes.length > 8 && (
          <p className="border-t border-grade px-4 py-2 text-xs text-tinta-suave">
            e mais {pendentes.length - 8} — abra o pedido para avisar.
          </p>
        )}
      </Cartao>
    </section>
  );
}
