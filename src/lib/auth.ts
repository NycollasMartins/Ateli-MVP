import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!URL_SUPABASE || !CHAVE_PUBLICA) {
  console.warn('[ateliê] Falta NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local');
}

/**
 * Cliente ligado aos cookies desta requisição — é ele que sabe quem está logado.
 * Diferente do `db` de `supabase.ts`, que usa a chave de serviço e ignora sessão.
 */
export async function clienteDaSessao() {
  const jar = await cookies();

  return createServerClient(URL_SUPABASE, CHAVE_PUBLICA, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(paraGravar) {
        try {
          paraGravar.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Componente de servidor não pode gravar cookie. Tudo bem:
          // quem renova a sessão é o middleware, a cada navegação.
        }
      },
    },
  });
}

/**
 * Quem está usando o painel agora, ou null.
 * Se o Supabase não responder, devolve null: é melhor pedir login de novo do
 * que estourar 500 numa tela ou devolver HTML onde o painel espera JSON.
 */
export async function usuarioAtual(): Promise<User | null> {
  try {
    const supabase = await clienteDaSessao();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

/** Nome curto de quem está logado, para a interface chamar pelo nome. */
export async function nomeDoUsuario(): Promise<string> {
  const usuario = await usuarioAtual();
  if (!usuario) return '';
  const nome = (usuario.user_metadata?.nome as string | undefined)?.trim();
  return nome || usuario.email?.split('@')[0] || '';
}

export async function estaLogado() {
  return Boolean(await usuarioAtual());
}

export function naoAutorizado() {
  return Response.json({ erro: 'Sessão expirada. Entre de novo.' }, { status: 401 });
}
