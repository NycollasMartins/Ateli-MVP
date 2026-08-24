import { db } from '@/lib/supabase';
import { estaLogado, naoAutorizado } from '@/lib/auth';
import { hojeNoAtelie } from '@/lib/formato';
import { lancarDespesasFixas } from '@/lib/despesas-fixas-servidor';

export const dynamic = 'force-dynamic';

/** Aceita só inteiro de centavos não negativo, venha o que vier do navegador. */
const centavos = (v: unknown) => Math.max(0, Math.round(Number(v)) || 0);

/** Data pura `yyyy-MM-dd`; qualquer outra coisa vira hoje, no fuso do ateliê. */
const dia = (v: unknown) => {
  const t = String(v ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : hojeNoAtelie();
};

export async function GET() {
  if (!(await estaLogado())) return naoAutorizado();

  // o que se repete entra aqui, e não numa tarefa agendada: assim funciona
  // igual em quem nunca configurou cron nenhum
  await lancarDespesasFixas();

  const { data, error } = await db
    .from('despesas')
    .select('*')
    .order('data', { ascending: false })
    .order('criado_em', { ascending: false })
    .limit(2000);

  if (error) return Response.json({ erro: 'Não foi possível carregar as despesas.' }, { status: 500 });
  return Response.json({ despesas: data });
}

export async function POST(req: Request) {
  if (!(await estaLogado())) return naoAutorizado();
  const c = await req.json().catch(() => ({}));

  const descricao = String(c.descricao ?? '').trim();
  if (!descricao) return Response.json({ erro: 'Escreva no que você gastou.' }, { status: 400 });

  const { data, error } = await db
    .from('despesas')
    .insert({
      descricao,
      categoria: String(c.categoria ?? 'Materiais').trim(),
      valor_centavos: centavos(c.valor_centavos),
      data: dia(c.data),
      observacao: c.observacao ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ erro: 'Não foi possível lançar a despesa.' }, { status: 500 });
  return Response.json({ despesa: data });
}
