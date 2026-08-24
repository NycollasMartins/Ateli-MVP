import { db } from '@/lib/supabase';
import { exigirAdmin } from '@/lib/auth';
import { lancarDespesasFixas } from '@/lib/despesas-fixas-servidor';

export const dynamic = 'force-dynamic';

const centavos = (v: unknown) => Math.max(0, Math.round(Number(v)) || 0);
const diaValido = (v: unknown) => Math.min(31, Math.max(1, Math.round(Number(v)) || 1));

export async function GET() {
  const barrado = await exigirAdmin();
  if (barrado) return barrado;
  const { data, error } = await db
    .from('despesas_fixas')
    .select('*')
    .order('dia_do_mes', { ascending: true });

  if (error) return Response.json({ erro: 'Não foi possível carregar.' }, { status: 500 });
  return Response.json({ fixas: data });
}

export async function POST(req: Request) {
  const barrado = await exigirAdmin();
  if (barrado) return barrado;
  const c = await req.json().catch(() => ({}));

  const descricao = String(c.descricao ?? '').trim();
  if (!descricao) return Response.json({ erro: 'Escreva o que se repete.' }, { status: 400 });

  const valor = centavos(c.valor_centavos);
  if (valor <= 0) return Response.json({ erro: 'Escreva quanto custa.' }, { status: 400 });

  const { data, error } = await db
    .from('despesas_fixas')
    .insert({
      descricao,
      categoria: String(c.categoria ?? 'Aluguel').trim(),
      valor_centavos: valor,
      dia_do_mes: diaValido(c.dia_do_mes),
    })
    .select()
    .single();

  if (error) return Response.json({ erro: 'Não foi possível salvar.' }, { status: 500 });

  // já lança o mês corrente, se o dia dela passou. A despesa fixa foi criada:
  // se o lançamento falhar, avisa em vez de desfazer.
  const { lancadas, erro } = await lancarDespesasFixas();
  return Response.json({ fixa: data, lancadas, aviso: erro ?? undefined });
}
