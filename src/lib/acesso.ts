/**
 * Quem pode abrir o quê.
 *
 * Este arquivo não é `server-only` de propósito: a navegação precisa dele para
 * esconder o que a pessoa não pode abrir, e ela roda no navegador. Esconder é
 * só cortesia — quem barra de verdade é o `src/proxy.ts` e a conferência que
 * cada rota de `/api/admin` faz por conta própria.
 */

export type Papel = 'admin' | 'funcionario';

export const PAPEIS: Papel[] = ['admin', 'funcionario'];

export const ehPapel = (v: unknown): v is Papel => v === 'admin' || v === 'funcionario';

export const ROTULO_PAPEL: Record<Papel, string> = {
  admin: 'Administrador',
  funcionario: 'Funcionário',
};

export const EXPLICA_PAPEL: Record<Papel, string> = {
  admin: 'Vê tudo, inclusive o financeiro, a equipe e o QR.',
  funcionario: 'Vê os pedidos, as clientes, a agenda e a tabela de preços.',
};

/**
 * As partes que só o administrador abre.
 *
 * A lista é de prefixos: `/api/admin/despesas` cobre `/api/admin/despesas/123`
 * sem cobrir `/api/admin/despesas-fixas`, que tem entrada própria — a
 * comparação exige o caminho inteiro ou uma barra depois dele.
 */
export const SO_ADMIN = [
  '/painel/financeiro',
  '/painel/qrcode',
  '/painel/equipe',
  '/api/admin/fechamentos',
  '/api/admin/despesas',
  '/api/admin/despesas-fixas',
  '/api/admin/equipe',
] as const;

export const soAdminPode = (caminho: string) =>
  SO_ADMIN.some((p) => caminho === p || caminho.startsWith(`${p}/`));

/**
 * O papel de quem está logado.
 *
 * Ele mora em `app_metadata`, e essa escolha é a segurança do painel inteiro:
 * a pessoa logada consegue escrever no próprio `user_metadata`, então um
 * funcionário se promoveria a admin sozinho, do navegador dela. No
 * `app_metadata` só a chave de serviço escreve.
 *
 * Na dúvida, funcionário: quem não tem papel escrito é quem tem menos acesso,
 * nunca mais.
 */
export function papelDe(usuario: { app_metadata?: Record<string, unknown> } | null | undefined): Papel {
  return usuario?.app_metadata?.papel === 'admin' ? 'admin' : 'funcionario';
}
