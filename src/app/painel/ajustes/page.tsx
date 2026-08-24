'use client';

import Link from 'next/link';
import { AJUSTES, paraOPapel } from '@/components/Navegacao';
import { usePapel } from '@/components/Papel';
import { Cabecalho } from '@/components/Cabecalho';
import { Cartao } from '@/components/ui';

const APOIO: Record<string, string> = {
  '/painel/precos': 'O que você cobra por serviço. A cliente vê a mesma tabela.',
  '/painel/qrcode': 'O cartaz para imprimir e colar na parede.',
  '/painel/equipe': 'Quem entra neste painel.',
};

/** Porta de entrada dos ajustes no celular, onde a barra de baixo só cabe o dia a dia. */
export default function Ajustes() {
  const itens = paraOPapel(AJUSTES, usePapel());

  return (
    <>
      <Cabecalho titulo="Ajustes" apoio="O que se mexe de vez em quando." />
      <div className="px-5 py-6 md:px-8">
        <Cartao>
          <ul className="divide-y divide-grade">
            {itens.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="flex items-center gap-4 px-4 py-4 hover:bg-papel-fundo">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{i.rotulo}</span>
                    <span className="block text-xs text-tinta-suave">{APOIO[i.href]}</span>
                  </span>
                  <span className="shrink-0 text-giz">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </Cartao>
      </div>
    </>
  );
}
