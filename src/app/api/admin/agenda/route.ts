import { estaLogado, naoAutorizado, exigirAdmin } from '@/lib/auth';
import {
  agendaConectada,
  desconectarAgenda,
  esquecerCredenciais,
  gravarCredenciais,
  lerCredenciais,
  enderecoDeVolta,
} from '@/lib/google';
import { enderecoDoPainel } from '@/lib/endereco';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await estaLogado())) return naoAutorizado();

  const credenciais = await lerCredenciais();

  return Response.json({
    conectada: await agendaConectada(),
    configurado: Boolean(credenciais),
    // o segredo nunca sai daqui; o id serve para ela conferir se colou o certo
    client_id: credenciais?.client_id ?? '',
    // é este endereço que precisa estar cadastrado no Google Cloud, letra por letra
    voltar_para: enderecoDeVolta(enderecoDoPainel(req)),
  });
}

/** Guarda as credenciais do Google Cloud. Só administrador mexe nisto. */
export async function PUT(req: Request) {
  const barrado = await exigirAdmin();
  if (barrado) return barrado;

  const c = await req.json().catch(() => ({}));
  const client_id = String(c.client_id ?? '').trim();
  const client_secret = String(c.client_secret ?? '').trim();

  if (!client_id || !client_secret) {
    return Response.json({ erro: 'Preencha o ID e a chave secreta.' }, { status: 400 });
  }
  // o ID do Google termina sempre assim; avisar agora poupa uma ida à tela de
  // permissão só para voltar com "client_id inválido" em inglês
  if (!client_id.endsWith('.apps.googleusercontent.com')) {
    return Response.json(
      { erro: 'O ID do cliente termina em .apps.googleusercontent.com. Confira o que você colou.' },
      { status: 400 }
    );
  }

  await gravarCredenciais({ client_id, client_secret });
  return Response.json({ ok: true });
}

/**
 * `?tudo=1` esquece também as credenciais — é o "trocar de conta do Google" da
 * tela. Sem isso, desconectar só solta a conta e mantém o aplicativo.
 */
export async function DELETE(req: Request) {
  const barrado = await exigirAdmin();
  if (barrado) return barrado;

  if (new URL(req.url).searchParams.get('tudo') === '1') {
    await esquecerCredenciais();
    return Response.json({ ok: true, esquecidas: true });
  }

  await desconectarAgenda();
  return Response.json({ ok: true, esquecidas: false });
}
