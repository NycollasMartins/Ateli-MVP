import { estaLogado, naoAutorizado } from '@/lib/auth';
import { fotosDoPedido, guardarFotos, apagarFoto } from '@/lib/fotos-servidor';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await estaLogado())) return naoAutorizado();
  const { id } = await ctx.params;
  return Response.json({ fotos: await fotosDoPedido(id) });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await estaLogado())) return naoAutorizado();
  const { id } = await ctx.params;

  const form = await req.formData().catch(() => null);
  const arquivos = (form?.getAll('fotos') ?? []).filter((f): f is File => f instanceof File);

  const r = await guardarFotos(id, arquivos, 'atelie');
  if ('erro' in r) return Response.json({ erro: r.erro }, { status: r.status });
  return Response.json({ fotos: r.fotos });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await estaLogado())) return naoAutorizado();
  const { id } = await ctx.params;

  const foto = new URL(req.url).searchParams.get('foto');
  if (!foto) return Response.json({ erro: 'Qual foto?' }, { status: 400 });

  const apagou = await apagarFoto(id, foto);
  if (!apagou) return Response.json({ erro: 'Essa foto já não está aqui.' }, { status: 404 });
  return Response.json({ ok: true });
}
