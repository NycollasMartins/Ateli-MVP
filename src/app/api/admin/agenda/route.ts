import { estaLogado, naoAutorizado } from '@/lib/auth';
import { agendaConectada, desconectarAgenda } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await estaLogado())) return naoAutorizado();
  const configurado = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return Response.json({ conectada: await agendaConectada(), configurado });
}

export async function DELETE() {
  if (!(await estaLogado())) return naoAutorizado();
  await desconectarAgenda();
  return Response.json({ ok: true });
}
