'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** O dia a dia: é o que fica na barra de baixo no celular. */
const PRINCIPAIS = [
  { href: '/painel', rotulo: 'Visão geral', icone: 'molde' },
  { href: '/painel/pedidos', rotulo: 'Pedidos', icone: 'etiqueta' },
  { href: '/painel/clientes', rotulo: 'Clientes', icone: 'pessoas' },
  { href: '/painel/agenda', rotulo: 'Agenda', icone: 'calendario' },
  { href: '/painel/financeiro', rotulo: 'Financeiro', icone: 'caixa' },
] as const;

/** O que se mexe de vez em quando. No celular, mora atrás de "Ajustes". */
export const AJUSTES = [
  { href: '/painel/precos', rotulo: 'Tabela de preços', icone: 'lista' },
  { href: '/painel/qrcode', rotulo: 'QR do ateliê', icone: 'qr' },
  { href: '/painel/equipe', rotulo: 'Equipe', icone: 'equipe' },
  { href: '/painel/marca', rotulo: 'Marca', icone: 'marca' },
  { href: '/painel/saude', rotulo: 'Estado da instalação', icone: 'ajustes' },
] as const;

function Icone({ nome }: { nome: string }) {
  const comum = { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 };
  switch (nome) {
    case 'molde':
      return (
        <svg {...comum} aria-hidden>
          <path d="M2.5 15.5 3 5l6-2.5 6.5 4-3 9z" strokeLinejoin="round" />
          <path d="M3 5l12 1.5" strokeDasharray="2 2" />
        </svg>
      );
    case 'etiqueta':
      return (
        <svg {...comum} aria-hidden>
          <path d="M9 2h6.5v6.5L8 16 2 10z" strokeLinejoin="round" />
          <circle cx="12.5" cy="5.5" r="1.2" />
        </svg>
      );
    case 'calendario':
      return (
        <svg {...comum} aria-hidden>
          <rect x="2.5" y="3.5" width="13" height="12" />
          <path d="M2.5 7h13M6 2v3M12 2v3" />
        </svg>
      );
    case 'caixa':
      return (
        <svg {...comum} aria-hidden>
          <rect x="2.5" y="5.5" width="13" height="9" />
          <path d="M2.5 8.5h13" />
          <circle cx="9" cy="11.5" r="1.4" />
        </svg>
      );
    case 'ajustes':
      return (
        <svg {...comum} aria-hidden>
          <circle cx="9" cy="9" r="2.4" />
          <path d="M9 1.8v1.8M9 14.4v1.8M16.2 9h-1.8M3.6 9H1.8M14.1 3.9l-1.3 1.3M5.2 12.8l-1.3 1.3M14.1 14.1l-1.3-1.3M5.2 5.2 3.9 3.9" strokeLinecap="round" />
        </svg>
      );
    case 'equipe':
    case 'pessoas':
      return (
        <svg {...comum} aria-hidden>
          <circle cx="6.5" cy="6" r="2.6" />
          <path d="M1.8 15c0-2.6 2.1-4.4 4.7-4.4s4.7 1.8 4.7 4.4" strokeLinecap="round" />
          <path d="M11.5 4.2a2.6 2.6 0 0 1 0 5M12.8 10.9c2 .4 3.4 2 3.4 4.1" strokeLinecap="round" />
        </svg>
      );
    case 'marca':
      return (
        <svg {...comum} aria-hidden>
          <path d="M9 2.2 3 5.4v4.1c0 3.3 2.4 5.7 6 6.3 3.6-.6 6-3 6-6.3V5.4z" strokeLinejoin="round" />
          <path d="M6.6 9.1 8.4 11l3.2-3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'lista':
      return (
        <svg {...comum} aria-hidden>
          <path d="M6 5h9M6 9h9M6 13h9M3 5h.01M3 9h.01M3 13h.01" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...comum} aria-hidden>
          <rect x="2.5" y="2.5" width="5" height="5" />
          <rect x="10.5" y="2.5" width="5" height="5" />
          <rect x="2.5" y="10.5" width="5" height="5" />
          <path d="M10.5 10.5h2v2h-2zM14 14h1.5v1.5H14zM10.5 15h1.5" />
        </svg>
      );
  }
}

export function Navegacao({
  nomeAtelie,
  logo,
  nomeUsuario,
}: {
  nomeAtelie: string;
  logo?: string | null;
  nomeUsuario?: string;
}) {
  const caminho = usePathname();
  const ativo = (href: string) => (href === '/painel' ? caminho === href : caminho.startsWith(href));

  return (
    <>
      {/* coluna lateral — base de corte */}
      <aside className="base-corte sem-impressao hidden w-60 shrink-0 flex-col justify-between border-r border-black/30 md:flex">
        <div>
          <div className="border-b border-white/10 px-5 py-6">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="mb-2 h-8 w-auto" />
            )}
            <p className="font-display text-lg leading-tight text-papel">{nomeAtelie}</p>
            <p className="rotulo mt-1 text-papel/60">{nomeUsuario || 'Painel do ateliê'}</p>
          </div>
          <nav className="p-3">
            {PRINCIPAIS.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className={`mb-0.5 flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors ${
                  ativo(i.href)
                    ? 'bg-papel text-tinta'
                    : 'text-papel/70 hover:bg-white/10 hover:text-papel'
                }`}
              >
                <Icone nome={i.icone} />
                {i.rotulo}
              </Link>
            ))}

            <p className="rotulo mb-1 mt-4 px-3 text-papel/60">Ajustes</p>
            {AJUSTES.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className={`mb-0.5 flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
                  ativo(i.href)
                    ? 'bg-papel text-tinta'
                    : 'text-papel/60 hover:bg-white/10 hover:text-papel'
                }`}
              >
                <Icone nome={i.icone} />
                {i.rotulo}
              </Link>
            ))}
          </nav>
        </div>
        <form action="/api/login" method="post" className="p-3">
          <input type="hidden" name="acao" value="sair" />
          <button className="w-full rounded px-3 py-2 text-left text-xs text-papel/60 hover:bg-white/10 hover:text-papel/80">
            {nomeUsuario ? `Sair — ${nomeUsuario}` : 'Sair do painel'}
          </button>
        </form>
      </aside>

      {/* barra inferior no celular */}
      <nav className="base-corte sem-impressao fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-black/30 md:hidden">
        {[...PRINCIPAIS, { href: '/painel/ajustes', rotulo: 'Ajustes', icone: 'ajustes' }].map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-label={i.rotulo}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[9px] ${
              ativo(i.href) ? 'text-fita' : 'text-papel/55'
            }`}
          >
            <Icone nome={i.icone} />
            {i.rotulo.split(' ')[0]}
          </Link>
        ))}
      </nav>
    </>
  );
}
