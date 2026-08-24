import { db, gerarCodigo } from '@/lib/supabase';
import { ipDe, passouDoLimite } from '@/lib/limite';
import { PECAS } from '@/lib/tipos';
import { LIMITE, texto, email } from '@/lib/entrada';

export const dynamic = 'force-dynamic';

type ItemEntrada = { servico_id: string; quantidade?: number };

export async function POST(req: Request) {
  if (passouDoLimite('pedidos', ipDe(req), 5)) {
    return Response.json({ erro: 'Muitos envios seguidos. Espere um minuto e tente de novo.' }, { status: 429 });
  }

  const corpo = await req.json().catch(() => null);
  if (!corpo) return Response.json({ erro: 'Não recebemos os dados do formulário.' }, { status: 400 });

  const nome = texto(corpo.cliente_nome, LIMITE.nome);
  const telefone = texto(corpo.cliente_telefone, LIMITE.telefone);
  const peca = texto(corpo.peca, LIMITE.peca);

  if (nome.length < 2) return Response.json({ erro: 'Escreva seu nome completo.' }, { status: 400 });
  if (telefone.replace(/\D/g, '').length < 10)
    return Response.json({ erro: 'Confira o WhatsApp: faltam números.' }, { status: 400 });
  // o formulário é uma lista fechada; qualquer outra coisa veio adulterada
  if (!PECAS.includes(peca))
    return Response.json({ erro: 'Escolha o tipo de peça.' }, { status: 400 });

  const entradas: ItemEntrada[] = Array.isArray(corpo.itens) ? corpo.itens.slice(0, 20) : [];
  const ids = entradas.map((i) => i.servico_id).filter(Boolean);

  // o preço vem sempre do banco, nunca do que o navegador mandou
  const { data: servicos } = ids.length
    ? await db.from('servicos').select('id, nome, preco_centavos').in('id', ids)
    : { data: [] as { id: string; nome: string; preco_centavos: number }[] };

  const itens = (servicos ?? []).map((s) => {
    const q = Math.max(1, Math.min(20, Number(entradas.find((e) => e.servico_id === s.id)?.quantidade ?? 1)));
    return { servico_id: s.id, nome: s.nome, quantidade: q, preco_unit_centavos: s.preco_centavos };
  });

  const total = itens.reduce((s, i) => s + i.preco_unit_centavos * i.quantidade, 0);

  let codigo = gerarCodigo();
  for (let i = 0; i < 5; i++) {
    const { data: existe } = await db.from('pedidos').select('id').eq('codigo', codigo).maybeSingle();
    if (!existe) break;
    codigo = gerarCodigo();
  }

  const { data: pedido, error } = await db
    .from('pedidos')
    .insert({
      codigo,
      cliente_nome: nome,
      cliente_telefone: telefone,
      cliente_email: email(corpo.cliente_email) || null,
      peca,
      descricao: texto(corpo.descricao, LIMITE.descricao) || null,
      urgente: Boolean(corpo.urgente),
      valor_centavos: total,
      status: 'novo',
    })
    .select()
    .single();

  if (error || !pedido) {
    return Response.json({ erro: 'O envio falhou. Tente de novo em instantes.' }, { status: 500 });
  }

  if (itens.length) {
    await db.from('pedido_itens').insert(itens.map((i) => ({ ...i, pedido_id: pedido.id })));
  }

  // o id volta para o formulário poder anexar as fotos logo em seguida
  return Response.json({ id: pedido.id, codigo: pedido.codigo, valor_centavos: total });
}
