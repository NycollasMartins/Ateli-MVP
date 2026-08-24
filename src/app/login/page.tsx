import type { Metadata } from 'next';
import { lerMarca } from '@/lib/marca-servidor';
import { faltaConfigurar } from '@/lib/configuracao';

export const metadata: Metadata = { title: 'Entrar' };

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; de?: string; config?: string }>;
}) {
  const { erro, de } = await searchParams;
  const marca = await lerMarca();
  const falta = faltaConfigurar();

  return (
    <main className="base-corte flex min-h-dvh items-center justify-center px-5">
      <div className="papel-molde w-full max-w-sm border border-black/20 p-8">
        {marca.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={marca.logo_url} alt="" className="mb-4 h-12 w-auto" />
        )}
        <p className="rotulo">Painel do ateliê</p>
        <h1 className="mt-2 font-display text-3xl leading-tight">{marca.nome}</h1>
        <p className="mt-2 text-sm text-tinta-suave">
          Esta parte é só sua. As clientes usam o QR da parede.
        </p>

        {falta.length > 0 && (
          <div className="mt-6 border-l-2 border-linha bg-linha-clara px-4 py-3">
            <p className="text-sm text-linha">
              O painel ainda não está ligado ao banco. Enquanto isto não for preenchido, nenhuma
              senha funciona.
            </p>
            <ul className="mt-3 space-y-2">
              {falta.map((v) => (
                <li key={v.nome} className="text-xs">
                  <code className="num block break-all text-tinta">{v.nome}</code>
                  <span className="text-tinta-suave">{v.onde}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-tinta-suave">
              Preencha no <code className="num">.env.local</code> (ou nas variáveis do serviço onde
              o site está publicado) e reinicie.
            </p>
          </div>
        )}

        <form action="/api/login" method="post" className="mt-7 space-y-4">
          <input type="hidden" name="de" value={de ?? ''} />

          <div>
            <label className="rotulo" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              autoFocus
              required
              className="campo-papel mt-1"
              placeholder="voce@exemplo.com"
            />
          </div>

          <div>
            <label className="rotulo" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              required
              className="campo-papel num mt-1"
              placeholder="••••••••"
            />
          </div>

          {erro && falta.length === 0 && (
            <p className="border-l-2 border-linha pl-3 text-sm text-linha">
              E-mail ou senha não conferem. Tente de novo.
            </p>
          )}

          <button disabled={falta.length > 0} className="btn btn-principal w-full">
            Entrar
          </button>
        </form>

        <p className="mt-6 text-xs text-tinta-suave">
          Esqueceu a senha? Peça para alguém que já entra no painel abrir Equipe e gerar uma nova
          para você.
        </p>
      </div>
    </main>
  );
}
