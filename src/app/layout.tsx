import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Archivo, Azeret_Mono } from 'next/font/google';
import { lerMarca } from '@/lib/marca-servidor';
import { cssDaMarca } from '@/lib/marca';
import { ProvedorMarca } from '@/components/Marca';
import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--fonte-display',
  display: 'swap',
});
const corpo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--fonte-corpo',
  display: 'swap',
});
const mono = Azeret_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--fonte-mono',
  display: 'swap',
});

/**
 * A marca vem do banco, então nenhuma página pode ser congelada no build:
 * senão o formulário do QR continuaria com o nome e as cores antigos até a
 * próxima publicação.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { nome } = await lerMarca();
  return {
    title: { default: nome, template: `%s · ${nome}` },
    description: 'Pedidos, retiradas e caixa do ateliê de costura.',
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { cores } = await lerMarca();
  return { themeColor: cores.mata, width: 'device-width', initialScale: 1 };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const marca = await lerMarca();

  return (
    <html lang="pt-BR" className={`${display.variable} ${corpo.variable} ${mono.variable}`}>
      <head>
        {/* As cores da marca entram como variáveis CSS antes da primeira pintura.
            O conteúdo é seguro: lerMarca() só devolve hex já validado. */}
        <style dangerouslySetInnerHTML={{ __html: cssDaMarca(marca.cores) }} />
      </head>
      <body>
        <ProvedorMarca marca={marca}>{children}</ProvedorMarca>
      </body>
    </html>
  );
}
