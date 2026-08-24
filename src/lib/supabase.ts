import 'server-only';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !chave) {
  console.warn('[ateliê] Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local');
}

/** Cliente de servidor. Nunca importe este arquivo em componentes do navegador. */
export const db = createClient(url ?? 'http://localhost', chave ?? 'sem-chave', {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function lerConfig<T = unknown>(chaveCfg: string): Promise<T | null> {
  const { data } = await db.from('config').select('valor').eq('chave', chaveCfg).maybeSingle();
  return (data?.valor as T) ?? null;
}

export async function gravarConfig(chaveCfg: string, valor: unknown) {
  await db.from('config').upsert({ chave: chaveCfg, valor, atualizado_em: new Date().toISOString() });
}

export function gerarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += letras[Math.floor(Math.random() * letras.length)];
  return `AT-${s}`;
}
