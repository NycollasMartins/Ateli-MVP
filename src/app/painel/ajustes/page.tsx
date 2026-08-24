'use client';

import Link from 'next/link';
import { AJUSTES } from '@/components/Navegacao';
import { Cabecalho } from '@/components/Cabecalho';
import { Cartao } from '@/components/ui';

const APOIO: Record<string, string> = {
  '/painel/precos': 'O que você cobra por serviço. A cliente vê a mesma tabela.',
  '/painel/qrcode': 'O cartaz para imprimir e colar na parede.',
  '/painel/equipe': 'Quem entra neste painel.',
  '/painel/marca': 'Nome, cores e logo do ateliê.',
  '/painel/saude': 'O que já está no lugar e o que ainda falta.',
};

/** Porta de entrada dos ajustes no celular, onde a barra de baixo só cabe o dia a dia. */
export default function Ajustes() {
  return (
    <>
      <Cabecalho titulo="Ajustes" apoio="O que se mexe de vez em quando." />
      <div className="px-5 py-6 md:px-8">
        <Cartao>
          <ul className="divide-y divide-grade">
            {AJUSTES.map((i) => (
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
