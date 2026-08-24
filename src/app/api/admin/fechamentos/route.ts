import { db } from '@/lib/supabase';
import { exigirAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Aceita só inteiro de centavos não negativo, venha o que vier do navegador. */
const centavos = (v: unknown) => Math.max(0, Math.round(Number(v)) || 0);

export async function GET() {
  const barrado = await exigirAdmin();
  if (barrado) return barrado;
  const { data } = await db.from('fechamentos').select('*').order('semana_inicio', { ascending: false }).limit(52);
  return Response.json({ fechamentos: data ?? [] });
}

export async function POST(req: Request) {
  const barrado = await exigirAdmin();
  if (barrado) return barrado;
  const c = await req.json().catch(() => ({}));
  if (!c.semana_inicio || !c.semana_fim)
    return Response.json({ erro: 'Semana inválida.' }, { status: 400 });

  const { data, error } = await db
    .from('fechamentos')
    .upsert(
      {
        semana_inicio: c.semana_inicio,
        semana_fim: c.semana_fim,
        total_centavos: centavos(c.total_centavos),
        despesas_centavos: centavos(c.despesas_centavos),
        pedidos_qtd: Math.max(0, Math.round(Number(c.pedidos_qtd)) || 0),
        observacao: c.observacao ?? null,
        fechado_em: new Date().toISOString(),
      },
      { onConflict: 'semana_inicio' }
    )
    .select()
    .single();

  if (error) return Response.json({ erro: 'Não foi possível fechar o caixa.' }, { status: 500 });
  return Response.json({ fechamento: data });
}
