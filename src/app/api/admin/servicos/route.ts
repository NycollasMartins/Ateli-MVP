import { db } from '@/lib/supabase';
import { estaLogado, naoAutorizado } from '@/lib/auth';
import { ehPrazoUnidade } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await estaLogado())) return naoAutorizado();
  const { data, error } = await db.from('servicos').select('*').order('ordem', { ascending: true });
  if (error) return Response.json({ erro: 'Não foi possível carregar a tabela.' }, { status: 500 });
  return Response.json({ servicos: data });
}

export async function POST(req: Request) {
  if (!(await estaLogado())) return naoAutorizado();
  const c = await req.json().catch(() => ({}));
  if (!String(c.nome ?? '').trim()) return Response.json({ erro: 'Dê um nome ao serviço.' }, { status: 400 });

  const { data, error } = await db
    .from('servicos')
    .insert({
      nome: String(c.nome).trim(),
      categoria: String(c.categoria ?? 'Ajustes').trim(),
      descricao: c.descricao ?? null,
      preco_centavos: Number(c.preco_centavos ?? 0),
      prazo_dias: Math.max(1, Math.round(Number(c.prazo_dias) || 7)),
      // unidade inventada viraria erro do Postgres pela trava do 010; aqui já
      // cai no padrão, que é o que a tabela sempre usou
      prazo_unidade: ehPrazoUnidade(c.prazo_unidade) ? c.prazo_unidade : 'dias',
      ordem: Number(c.ordem ?? 99),
    })
    .select()
    .single();

  if (error) return Response.json({ erro: 'Não foi possível adicionar.' }, { status: 500 });
  return Response.json({ servico: data });
}
