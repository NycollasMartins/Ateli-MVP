import { estaLogado, naoAutorizado } from '@/lib/auth';
import { lerMarca, gravarMarca } from '@/lib/marca-servidor';
import { CORES_PADRAO, normalizarHex, MARCA_PADRAO } from '@/lib/marca';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await estaLogado())) return naoAutorizado();
  return Response.json({ marca: await lerMarca() });
}

export async function PUT(req: Request) {
  if (!(await estaLogado())) return naoAutorizado();
  const c = await req.json().catch(() => ({}));
  const atual = await lerMarca();

  const nome = String(c.nome ?? '').trim();
  if (!nome) return Response.json({ erro: 'O ateliê precisa de um nome.' }, { status: 400 });
  if (nome.length > 60) {
    return Response.json({ erro: 'O nome ficou comprido demais para caber no menu.' }, { status: 400 });
  }

  // cor inválida cai no padrão em vez de derrubar a tela inteira
  const marca = {
    nome,
    logo_url: c.logo_url === null ? null : (c.logo_url ?? atual.logo_url),
    cores: {
      mata: normalizarHex(c.cores?.mata ?? '', CORES_PADRAO.mata),
      fita: normalizarHex(c.cores?.fita ?? '', CORES_PADRAO.fita),
      giz: normalizarHex(c.cores?.giz ?? '', CORES_PADRAO.giz),
      linha: normalizarHex(c.cores?.linha ?? '', CORES_PADRAO.linha),
    },
  };

  await gravarMarca(marca);
  return Response.json({ marca });
}

/** Volta tudo ao desenho original. */
export async function DELETE() {
  if (!(await estaLogado())) return naoAutorizado();
  const atual = await lerMarca();
  const marca = { ...MARCA_PADRAO, nome: atual.nome, logo_url: atual.logo_url };
  await gravarMarca(marca);
  return Response.json({ marca });
}
