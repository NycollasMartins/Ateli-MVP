import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await db
    .from('servicos')
    .select('*')
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  if (error) return Response.json({ erro: 'Não foi possível carregar a tabela de preços.' }, { status: 500 });
  return Response.json({ servicos: data });
}
