import { db } from '@/lib/supabase';
import { estaLogado, naoAutorizado } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await estaLogado())) return naoAutorizado();

  const { data, error } = await db
    .from('pedidos')
    .select('*, pedido_itens(*), notificacoes(tipo), pedido_fotos(id)')
    .order('criado_em', { ascending: false })
    .limit(2000);

  if (error) return Response.json({ erro: 'Não foi possível carregar os pedidos.' }, { status: 500 });
  return Response.json({ pedidos: data });
}
