import { db } from '@/lib/supabase';
import { estaLogado, naoAutorizado } from '@/lib/auth';
import { CHAVE_AVISO, type TipoAviso } from '@/lib/mensagens';

export const dynamic = 'force-dynamic';

/**
 * Marca que a costureira já mandou uma mensagem para a cliente.
 * Serve só para a lista de "avisar hoje" parar de cobrar o que já foi feito —
 * o WhatsApp em si sai do celular dela, não daqui.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await estaLogado())) return naoAutorizado();
  const { id } = await ctx.params;
  const corpo = await req.json().catch(() => ({}));

  const tipo = CHAVE_AVISO[corpo.tipo as TipoAviso];
  if (!tipo) return Response.json({ erro: 'Aviso desconhecido.' }, { status: 400 });

  const { error } = await db
    .from('notificacoes')
    .upsert({ pedido_id: id, tipo, canal: 'whatsapp' }, { onConflict: 'pedido_id,tipo' });

  if (error) return Response.json({ erro: 'Não foi possível anotar o aviso.' }, { status: 500 });
  return Response.json({ ok: true });
}
