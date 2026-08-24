import 'server-only';
import { db } from './supabase';
import { dataLocal, hojeNoAtelie } from './formato';
import { ocorrenciasAte } from './despesas-fixas';
import type { DespesaFixa } from './tipos';

/**
 * Lança o que já venceu e ainda não foi lançado.
 *
 * Roda toda vez que o painel pede as despesas, e pode rodar quantas vezes for:
 * o índice único em (despesa_fixa_id, competencia) descarta a repetição.
 * Assim funciona também em quem não configurou tarefa agendada nenhuma.
 */
export async function lancarDespesasFixas(
  hoje = dataLocal(hojeNoAtelie())!
): Promise<{ lancadas: number; erro: string | null }> {
  const { data: fixas } = await db.from('despesas_fixas').select('*').eq('ativa', true);
  if (!fixas?.length) return { lancadas: 0, erro: null };

  const novas = (fixas as DespesaFixa[]).flatMap((fixa) =>
    ocorrenciasAte(fixa, hoje).map((o) => ({
      descricao: fixa.descricao,
      categoria: fixa.categoria,
      valor_centavos: fixa.valor_centavos,
      data: o.data,
      despesa_fixa_id: fixa.id,
      competencia: o.competencia,
    }))
  );

  if (!novas.length) return { lancadas: 0, erro: null };

  const { data: gravadas, error } = await db
    .from('despesas')
    .upsert(novas, { onConflict: 'despesa_fixa_id,competencia', ignoreDuplicates: true })
    .select('id');

  if (error) {
    // Silenciar aqui é o pior dos mundos: a tela diria "entra sozinha todo dia
    // 5" e nada entraria, para sempre, sem erro nenhum.
    console.error('[ateliê] despesas que se repetem não foram lançadas:', error.message);
    return { lancadas: 0, erro: 'Não consegui lançar o que se repete. Confira o banco.' };
  }

  return { lancadas: gravadas?.length ?? 0, erro: null };
}
