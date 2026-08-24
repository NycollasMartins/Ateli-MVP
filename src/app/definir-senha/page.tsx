'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseDoNavegador } from '@/lib/supabase-navegador';
import { SENHA_MINIMA } from '@/lib/senha';

type Situacao = 'lendo' | 'pronta' | 'sem-convite';

/**
 * Onde quem foi convidado escolhe a própria senha.
 *
 * O link do e-mail chega de duas formas, conforme o modelo de mensagem
 * configurado no Supabase: com os tokens depois do `#`, que o próprio cliente
 * lê sozinho, ou com `token_hash` na busca, que precisa ser trocado à mão.
 * Tratar só uma delas dá uma tela que diz "convite vencido" para um convite
 * que acabou de chegar.
 */
export default function DefinirSenha() {
  const [situacao, setSituacao] = useState<Situacao>('lendo');
  const [senha, setSenha] = useState('');
  const [repetida, setRepetida] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseDoNavegador();

    (async () => {
      const busca = new URLSearchParams(window.location.search);
      const token_hash = busca.get('token_hash');
      const tipo = busca.get('type');

      if (token_hash && (tipo === 'invite' || tipo === 'recovery' || tipo === 'email')) {
        await supabase.auth.verifyOtp({ token_hash, type: tipo }).catch(() => null);
      }

      const { data } = await supabase.auth.getSession();
      setSituacao(data.session ? 'pronta' : 'sem-convite');
    })();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;
    setErro(null);

    if (senha.length < SENHA_MINIMA) {
      return setErro(`A senha precisa de pelo menos ${SENHA_MINIMA} letras ou números.`);
    }
    if (senha !== repetida) return setErro('As duas senhas não são iguais.');

    setSalvando(true);
    const { error } = await supabaseDoNavegador().auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) return setErro('Não foi possível guardar a senha. Peça um convite novo.');

    // a sessão já vale: entra direto, em vez de pedir a senha recém-criada
    router.push('/painel');
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-papel-fundo px-5 py-12">
      <div className="papel-molde w-full max-w-sm border border-grade p-8">
        {situacao === 'lendo' && <p className="text-sm text-tinta-suave">Conferindo o convite…</p>}

        {situacao === 'sem-convite' && (
          <>
            <p className="rotulo">Convite</p>
            <h1 className="mt-1.5 font-display text-2xl leading-tight">Este link não vale mais</h1>
            <p className="mt-3 text-sm leading-relaxed text-tinta-suave">
              Links de convite vencem. Peça a quem administra o painel para enviar outro — leva um
              minuto.
            </p>
          </>
        )}

        {situacao === 'pronta' && (
          <form onSubmit={salvar}>
            <p className="rotulo">Bem-vinda ao painel</p>
            <h1 className="mt-1.5 font-display text-2xl leading-tight">Escolha a sua senha</h1>
            <p className="mt-3 text-sm leading-relaxed text-tinta-suave">
              Ela é só sua: ninguém do ateliê consegue vê-la depois.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="senha" className="text-sm">
                  Senha nova
                </label>
                <input
                  id="senha"
                  type="password"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="campo-papel"
                />
                <p className="mt-1 text-xs text-tinta-suave">
                  Pelo menos {SENHA_MINIMA} letras ou números.
                </p>
              </div>
              <div>
                <label htmlFor="repetida" className="text-sm">
                  Repita a senha
                </label>
                <input
                  id="repetida"
                  type="password"
                  autoComplete="new-password"
                  value={repetida}
                  onChange={(e) => setRepetida(e.target.value)}
                  className="campo-papel"
                />
              </div>
            </div>

            {erro && (
              <p className="mt-4 border-l-2 border-linha bg-linha-clara px-4 py-3 text-sm text-linha">
                {erro}
              </p>
            )}

            <button type="submit" disabled={salvando} className="btn btn-principal mt-6 w-full">
              {salvando ? 'Guardando…' : 'Guardar e entrar'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
