import 'server-only';
/**
 * Confere se o essencial do `.env.local` está preenchido.
 *
 * Sem isto, quem publica sem uma das chaves vê "e-mail ou senha não conferem"
 * com a senha certa — e vai procurar o erro no lugar errado.
 */

const OBRIGATORIAS = [
  {
    nome: 'NEXT_PUBLIC_SUPABASE_URL',
    onde: 'Supabase → Project Settings → API → Project URL',
    valor: () => process.env.NEXT_PUBLIC_SUPABASE_URL,
  },
  {
    nome: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    onde: 'Supabase → Project Settings → API → chave anon / publishable',
    valor: () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  {
    nome: 'SUPABASE_SERVICE_ROLE_KEY',
    onde: 'Supabase → Project Settings → API → chave service_role',
    valor: () => process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
] as const;

export type Faltante = { nome: string; onde: string };

/** O que falta preencher. Lista vazia significa que está tudo no lugar. */
export function faltaConfigurar(): Faltante[] {
  return OBRIGATORIAS.filter((v) => !String(v.valor() ?? '').trim()).map(({ nome, onde }) => ({
    nome,
    onde,
  }));
}

export const estaConfigurado = () => faltaConfigurar().length === 0;
