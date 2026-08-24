import { db } from '@/lib/supabase';
import { guardarFotos } from '@/lib/fotos-servidor';
import { MAXIMO_CLIENTE, MINUTOS_PARA_ANEXAR } from '@/lib/fotos';
import { ipDe, passouDoLimite } from '@/lib/limite';

export const dynamic = 'force-dynamic';

/**
 * Rota aberta: a cliente anexa foto ao pedido que ela acabou de fazer pelo QR.
 *
 * Como não há login aqui, o que segura o portão é a janela: só pedido ainda
 * sem data, criado há poucos minutos, e poucas fotos. O id é um uuid, então
 * não dá para sair adivinhando pedido de outra pessoa.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (passouDoLimite('fotos', ipDe(req), 10)) {
    return Response.json({ erro: 'Muitos envios seguidos. Espere um minuto.' }, { status: 429 });
  }

  const { id } = await ctx.params;

  const { data: pedido } = await db
    .from('pedidos')
    .select('id, status, criado_em')
    .eq('id', id)
    .maybeSingle();

  if (!pedido) return Response.json({ erro: 'Pedido não encontrado.' }, { status: 404 });

  const minutos = (Date.now() - new Date(pedido.criado_em).getTime()) / 60_000;
  if (pedido.status !== 'novo' || minutos > MINUTOS_PARA_ANEXAR) {
    return Response.json(
      { erro: 'Este pedido já não aceita foto por aqui. Mande no WhatsApp do ateliê.' },
      { status: 409 }
    );
  }

  const form = await req.formData().catch(() => null);
  const arquivos = (form?.getAll('fotos') ?? [])
    .filter((f): f is File => f instanceof File)
    .slice(0, MAXIMO_CLIENTE);

  const r = await guardarFotos(id, arquivos, 'cliente');
  if ('erro' in r) return Response.json({ erro: r.erro }, { status: r.status });

  // a cliente não precisa das URLs de volta: quem vê as fotos é o ateliê
  return Response.json({ ok: true, quantidade: r.fotos.length });
}
