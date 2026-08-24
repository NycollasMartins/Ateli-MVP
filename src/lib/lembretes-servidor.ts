import 'server-only';
import { db } from './supabase';

/**
 * Apaga os avisos já dados deste pedido.
 *
 * Chamado quando a data da retirada muda: os lembretes de 72h e 24h e as
 * mensagens de WhatsApp falavam do dia antigo. Sem isto, a cliente é tratada
 * como avisada e aparece no dia errado.
 */
export async function liberarLembretes(pedidoId: string) {
  await db.from('notificacoes').delete().eq('pedido_id', pedidoId);
}
