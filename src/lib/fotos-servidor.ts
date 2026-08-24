import 'server-only';
import { db } from './supabase';
import { BALDE_FOTOS, TAMANHO_MAXIMO, TIPOS_FOTO, MAXIMO_POR_PEDIDO, type Foto } from './fotos';

const VALIDADE = 60 * 60; // 1 hora

/** As fotos de um pedido, com URL assinada para mostrar na tela. */
export async function fotosDoPedido(pedidoId: string): Promise<Foto[]> {
  const { data: linhas } = await db
    .from('pedido_fotos')
    .select('id, caminho, origem, criado_em')
    .eq('pedido_id', pedidoId)
    .order('criado_em', { ascending: true });

  if (!linhas?.length) return [];

  const { data: assinadas } = await db.storage
    .from(BALDE_FOTOS)
    .createSignedUrls(linhas.map((l) => l.caminho), VALIDADE);

  const porCaminho = new Map((assinadas ?? []).map((a) => [a.path, a.signedUrl]));

  return linhas
    .map((l) => ({
      id: l.id,
      url: porCaminho.get(l.caminho) ?? '',
      origem: l.origem as Foto['origem'],
      criado_em: l.criado_em,
    }))
    .filter((f) => f.url);
}

type Resultado = { erro: string; status: number } | { fotos: Foto[] };

/** Guarda os arquivos e devolve a lista já atualizada do pedido. */
export async function guardarFotos(
  pedidoId: string,
  arquivos: File[],
  origem: 'cliente' | 'atelie'
): Promise<Resultado> {
  if (!arquivos.length) return { erro: 'Escolha pelo menos uma foto.', status: 400 };

  const { count } = await db
    .from('pedido_fotos')
    .select('id', { count: 'exact', head: true })
    .eq('pedido_id', pedidoId);

  if ((count ?? 0) + arquivos.length > MAXIMO_POR_PEDIDO) {
    return { erro: `Cada pedido guarda até ${MAXIMO_POR_PEDIDO} fotos.`, status: 400 };
  }

  for (const arquivo of arquivos) {
    if (!TIPOS_FOTO[arquivo.type]) {
      return { erro: 'A foto precisa ser JPG, PNG ou WEBP.', status: 400 };
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
      return { erro: 'Uma das fotos passa de 5 MB. Tire outra menor.', status: 400 };
    }
  }

  const gravados: string[] = [];
  for (const [i, arquivo] of arquivos.entries()) {
    const caminho = `${pedidoId}/${Date.now()}-${i}.${TIPOS_FOTO[arquivo.type]}`;
    const { error } = await db.storage
      .from(BALDE_FOTOS)
      .upload(caminho, arquivo, { contentType: arquivo.type });

    if (error) {
      // não deixa arquivo solto no balde quando o envio quebra no meio
      if (gravados.length) await db.storage.from(BALDE_FOTOS).remove(gravados);
      return { erro: 'Não foi possível guardar a foto.', status: 500 };
    }
    gravados.push(caminho);
  }

  const { error } = await db
    .from('pedido_fotos')
    .insert(gravados.map((caminho) => ({ pedido_id: pedidoId, caminho, origem })));

  if (error) {
    await db.storage.from(BALDE_FOTOS).remove(gravados);
    return { erro: 'Não foi possível guardar a foto.', status: 500 };
  }

  return { fotos: await fotosDoPedido(pedidoId) };
}

/** Apaga a linha e o arquivo. */
export async function apagarFoto(pedidoId: string, fotoId: string) {
  const { data: foto } = await db
    .from('pedido_fotos')
    .select('caminho')
    .eq('id', fotoId)
    .eq('pedido_id', pedidoId)
    .maybeSingle();

  if (!foto) return false;

  await db.from('pedido_fotos').delete().eq('id', fotoId);
  await db.storage.from(BALDE_FOTOS).remove([foto.caminho]);
  return true;
}

/** Limpa o balde quando o pedido inteiro é apagado — o cascade não faz isso. */
export async function apagarFotosDoPedido(pedidoId: string) {
  const { data: linhas } = await db.from('pedido_fotos').select('caminho').eq('pedido_id', pedidoId);
  const caminhos = (linhas ?? []).map((l) => l.caminho);
  if (caminhos.length) await db.storage.from(BALDE_FOTOS).remove(caminhos);
}
