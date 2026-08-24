import { ProvedorAvisos } from '@/components/Avisos';
import { Navegacao } from '@/components/Navegacao';
import { nomeDoUsuario, papelAtual } from '@/lib/auth';
import { ProvedorPapel } from '@/components/Papel';
import { lerMarca } from '@/lib/marca-servidor';

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const marca = await lerMarca();
  const usuario = await nomeDoUsuario();
  const papel = (await papelAtual()) ?? 'funcionario';

  return (
    <ProvedorAvisos>
      <ProvedorPapel papel={papel}>
      <div className="flex min-h-dvh">
        {/* Primeiro foco da página: sem isto o teclado percorre os nove itens
            do menu antes de chegar ao conteúdo, em toda navegação. */}
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:border focus:border-mata focus:bg-papel focus:px-3 focus:py-2 focus:text-sm"
        >
          Pular para o conteúdo
        </a>
        <Navegacao nomeAtelie={marca.nome} logo={marca.logo_url} nomeUsuario={usuario} />
        <main id="conteudo" tabIndex={-1} className="papel-molde min-w-0 flex-1 pb-20 outline-none md:pb-0">
          {children}
        </main>
      </div>
      </ProvedorPapel>
    </ProvedorAvisos>
  );
}
