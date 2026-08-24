'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { dataLocal } from '@/lib/formato';
import type { Pedido } from '@/lib/tipos';

/**
 * Fita métrica de retiradas.
 * Cada marca da fita é um dia. Os alfinetes em cima são as peças a entregar.
 */
export function FitaMetrica({
  pedidos,
  aoEscolherDia,
}: {
  pedidos: Pedido[];
  aoEscolherDia?: (isoDia: string) => void;
}) {
  const [dias, setDias] = useState(14);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 780px)');
    const ajustar = () => setDias(mq.matches ? 7 : 14);
    ajustar();
    mq.addEventListener('change', ajustar);
    return () => mq.removeEventListener('change', ajustar);
  }, []);


  const UNI = 92;
  const TOPO = 46;
  const ALTURA = 112;
  const largura = dias * UNI;

  const grade = useMemo(() => {
    /**
     * O dia é recalculado a cada atualização da lista, não uma vez ao abrir.
     * Painel esquecido aberto — tablet na parede, aba que nunca fecha — virava
     * a noite marcando ontem como HOJE, com todos os dias deslocados, enquanto
     * a lista de próximas retiradas logo abaixo mostrava o certo.
     */
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);

    return Array.from({ length: dias }, (_, i) => {
      const data = addDays(hoje, i);
      const doDia = pedidos.filter((p) => {
        const d = dataLocal(p.retirada_em);
        return d && isSameDay(d, data) && p.status !== 'cancelado' && p.status !== 'entregue';
      });
      return { data, doDia };
    });
  }, [dias, pedidos]);

  const total = grade.reduce((s, d) => s + d.doDia.length, 0);

  return (
    <figure className="overflow-hidden border border-grade bg-papel">
      <figcaption className="flex items-baseline justify-between border-b border-grade px-4 py-2.5">
        <p className="rotulo">Próximos {dias} dias</p>
        <p className="num text-[11px] text-tinta-suave">
          {total} {total === 1 ? 'peça para entregar' : 'peças para entregar'}
        </p>
      </figcaption>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${largura} ${ALTURA}`}
          className="block h-[112px] w-full min-w-[640px]"
          role="img"
          aria-label={`Fita de retiradas dos próximos ${dias} dias`}
        >
          {/* corpo da fita */}
          <rect x="0" y={TOPO} width={largura} height={ALTURA - TOPO} className="fill-fita" />
          <rect x="0" y={TOPO} width={largura} height="2" className="fill-fita-escura" opacity="0.35" />
          <rect x="0" y={ALTURA - 3} width={largura} height="3" className="fill-fita-escura" opacity="0.25" />

          <text x="10" y={ALTURA - 7} className="font-mono fill-tinta" fontSize="8"  opacity="0.45">
            FITA DE RETIRADAS · ATELIÊ
          </text>

          {grade.map(({ data, doDia }, i) => {
            const x = i * UNI;
            const ehHoje = i === 0;
            const fimDeSemana = [0, 6].includes(data.getDay());
            return (
              <g key={i}>
                {/* marcas menores entre os dias, como os milímetros da fita */}
                {[1, 2, 3].map((m) => (
                  <line
                    key={m}
                    x1={x + (UNI / 4) * m}
                    y1={TOPO}
                    x2={x + (UNI / 4) * m}
                    y2={TOPO + 9}
                    className="stroke-tinta"
                    strokeWidth="1"
                    opacity="0.3"
                  />
                ))}
                {/* marca do dia */}
                <line x1={x} y1={TOPO} x2={x} y2={TOPO + 24} className="stroke-tinta" strokeWidth="1.6" />

                <text
                  x={x + 7}
                  y={TOPO + 22}
                  className="font-mono fill-tinta"
                  fontSize="17"
                  
                  opacity={fimDeSemana ? 0.45 : 1}
                >
                  {format(data, 'dd')}
                </text>
                <text
                  x={x + 7}
                  y={TOPO + 38}
                  className="font-mono fill-tinta"
                  fontSize="9"
                  
                  opacity="0.6"
                  letterSpacing="1"
                >
                  {format(data, 'EEEEEE', { locale: ptBR }).toUpperCase()}
                </text>

                {/* alfinetes: uma peça a entregar neste dia */}
                {doDia.length > 0 && (
                  <g
                    className="cursor-pointer"
                    onClick={() => aoEscolherDia?.(format(data, 'yyyy-MM-dd'))}
                  >
                    <title>
                      {doDia.map((p) => `${p.cliente_nome} — ${p.peca}`).join(' · ')}
                    </title>
                    <line x1={x + 22} y1={TOPO} x2={x + 22} y2={26} className="stroke-mata" strokeWidth="1.4" />
                    <circle cx={x + 22} cy="18" r="12" className="fill-mata" />
                    <text
                      x={x + 22}
                      y="23"
                      textAnchor="middle"
                      className="font-mono fill-papel"
                      fontSize="12"
                      
                    >
                      {doDia.length}
                    </text>
                    {doDia.length === 1 && (
                      <text x={x + 38} y="22" className="font-sans fill-tinta-suave" fontSize="11" >
                        {doDia[0].cliente_nome.split(' ')[0].slice(0, 9)}
                      </text>
                    )}
                  </g>
                )}

                {ehHoje && (
                  <>
                    <line x1={x + 1} y1="0" x2={x + 1} y2={ALTURA} className="stroke-linha" strokeWidth="2" />
                    <text
                      x={x + 6}
                      y="10"
                      className="font-mono fill-linha"
                      fontSize="9"
                      
                      letterSpacing="1.5"
                    >
                      HOJE
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="sr-only">
        {grade
          .filter((g) => g.doDia.length)
          .map((g, i) => (
            <li key={i}>
              {format(g.data, "dd 'de' MMMM", { locale: ptBR })}:{' '}
              {g.doDia.map((p) => `${p.cliente_nome}, ${p.peca}`).join('; ')}
            </li>
          ))}
      </ul>
    </figure>
  );
}
