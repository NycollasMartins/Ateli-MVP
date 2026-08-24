import { db } from '@/lib/supabase';
import { estaLogado, naoAutorizado } from '@/lib/auth';
import { lerMarca, gravarMarca } from '@/lib/marca-servidor';

export const dynamic = 'force-dynamic';

const BALDE = 'marca';
const LIMITE = 1024 * 1024; // 1 MB
const TIPOS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export async function POST(req: Request) {
  if (!(await estaLogado())) return naoAutorizado();

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get('logo');
  if (!(arquivo instanceof File)) {
    return Response.json({ erro: 'Escolha um arquivo de imagem.' }, { status: 400 });
  }

  const extensao = TIPOS[arquivo.type];
  if (!extensao) {
    return Response.json({ erro: 'O logo precisa ser PNG, JPG, WEBP ou SVG.' }, { status: 400 });
  }
  if (arquivo.size > LIMITE) {
    return Response.json({ erro: 'O arquivo passa de 1 MB. Use uma imagem menor.' }, { status: 400 });
  }

  // nome novo a cada envio: o antigo fica em cache nos navegadores
  const caminho = `logo-${Date.now()}.${extensao}`;

  const { error } = await db.storage.from(BALDE).upload(caminho, arquivo, {
    contentType: arquivo.type,
    upsert: true,
  });
  if (error) {
    return Response.json({ erro: 'Não foi possível enviar o logo.' }, { status: 500 });
  }

  const { data } = db.storage.from(BALDE).getPublicUrl(caminho);
  const marca = await lerMarca();
  const anterior = marca.logo_url;
  await gravarMarca({ ...marca, logo_url: data.publicUrl });

  // limpa o arquivo antigo só depois de o novo já estar valendo
  const antigo = anterior?.split(`/${BALDE}/`)[1];
  if (antigo && antigo !== caminho) await db.storage.from(BALDE).remove([antigo]);

  return Response.json({ logo_url: data.publicUrl });
}

export async function DELETE() {
  if (!(await estaLogado())) return naoAutorizado();

  const marca = await lerMarca();
  const caminho = marca.logo_url?.split(`/${BALDE}/`)[1];
  await gravarMarca({ ...marca, logo_url: null });
  if (caminho) await db.storage.from(BALDE).remove([caminho]);

  return Response.json({ ok: true });
}
