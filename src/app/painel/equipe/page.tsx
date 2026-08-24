'use client';

import { useCallback, useEffect, useState } from 'react';
import { enviar, irParaLogin } from '@/lib/dados';
import { horaDe } from '@/lib/formato';
import { Cabecalho } from '@/components/Cabecalho';
import { Cartao, Rotulo, Vazio, Linha } from '@/components/ui';
import { useAviso } from '@/components/Avisos';
import { PAPEIS, ROTULO_PAPEL, EXPLICA_PAPEL, type Papel } from '@/lib/acesso';

type Pessoa = {
  id: string;
  email: string;
  nome: string;
  papel: Papel;
  criado_em: string;
  ultimo_acesso: string | null;
  confirmado: boolean;
};

export default function Equipe() {
  const avisar = useAviso();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nova, setNova] = useState({ nome: '', email: '', papel: 'funcionario' as Papel });
  const [minhaSenha, setMinhaSenha] = useState('');

  const recarregar = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/equipe', { cache: 'no-store' });
      if (r.status === 401) return irParaLogin();
      const { pessoas: lista } = await r.json();
      setPessoas(lista ?? []);
      setErro(false);
    } catch {
      // "ninguém cadastrado" é mentira perigosa justamente nesta tela
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function adicionar() {
    if (!nova.nome.trim()) return avisar('Escreva o nome da pessoa.', 'erro');
    if (!nova.email.includes('@')) return avisar('Escreva um e-mail válido.', 'erro');
    setSalvando(true);
    try {
      await enviar('/api/admin/equipe', 'POST', nova);
      const paraQuem = nova.email.trim();
      setNova({ nome: '', email: '', papel: nova.papel });
      await recarregar();
      avisar(`Convite enviado para ${paraQuem}. A pessoa escolhe a senha pelo link.`);
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function mandarLinkDeSenha(p: Pessoa) {
    if (!window.confirm(`Mandar para ${p.email} um link para escolher outra senha?`)) return;
    try {
      await enviar(`/api/admin/equipe/${p.id}/senha`, 'POST');
      avisar(`Link enviado para ${p.email}.`);
    } catch (e) {
      avisar((e as Error).message, 'erro');
    }
  }

  async function trocarPapel(p: Pessoa, papel: Papel) {
    if (papel === p.papel) return;
    try {
      await enviar(`/api/admin/equipe/${p.id}`, 'PATCH', { papel });
      await recarregar();
      avisar(`${p.nome} agora é ${ROTULO_PAPEL[papel].toLowerCase()}.`);
    } catch (e) {
      avisar((e as Error).message, 'erro');
      // a lista volta ao que o servidor diz: o select não pode ficar mostrando
      // um papel que não foi aceito
      await recarregar();
    }
  }

  async function tirarAcesso(p: Pessoa) {
    if (!window.confirm(`Tirar o acesso de ${p.nome} (${p.email})?`)) return;
    try {
      await enviar(`/api/admin/equipe/${p.id}`, 'DELETE');
      await recarregar();
      avisar(`${p.nome} não entra mais no painel.`);
    } catch (e) {
      avisar((e as Error).message, 'erro');
    }
  }

  async function trocarMinhaSenha() {
    setSalvando(true);
    try {
      await enviar('/api/admin/senha', 'PATCH', { senha: minhaSenha });
      setMinhaSenha('');
      avisar('Senha trocada. Use a nova da próxima vez que entrar.');
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Equipe"
        apoio="Quem pode entrar neste painel. Cada pessoa com o próprio e-mail e a própria senha."
      />

      <div className="space-y-5 px-5 py-6 md:px-8">
        <Cartao>
          <div className="border-b border-grade px-4 py-2.5">
            <Rotulo>Convidar alguém</Rotulo>
          </div>
          <div className="grid gap-2 bg-papel-fundo p-3 sm:grid-cols-[1fr_1fr_10rem_auto]">
            <input
              value={nova.nome}
              onChange={(e) => setNova({ ...nova, nome: e.target.value })}
              placeholder="Nome"
              aria-label="Nome da pessoa"
              className="campo"
            />
            <input
              value={nova.email}
              onChange={(e) => setNova({ ...nova, email: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
              type="email"
              placeholder="email@exemplo.com"
              aria-label="E-mail da pessoa"
              className="campo"
            />
            <select
              value={nova.papel}
              onChange={(e) => setNova({ ...nova, papel: e.target.value as Papel })}
              aria-label="Acesso da pessoa"
              className="campo"
            >
              {PAPEIS.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PAPEL[p]}
                </option>
              ))}
            </select>
            <button onClick={adicionar} disabled={salvando} className="btn btn-principal">
              Enviar convite
            </button>
          </div>
          <p className="px-4 py-2.5 text-xs leading-relaxed text-tinta-suave">
            Chega um e-mail com um link para a pessoa escolher a própria senha. Ninguém aqui vê a
            senha de ninguém. <strong>{ROTULO_PAPEL.funcionario}:</strong>{' '}
            {EXPLICA_PAPEL.funcionario.toLowerCase()}
          </p>
        </Cartao>

        <Cartao>
          <div className="flex items-baseline justify-between border-b border-grade px-4 py-2.5">
            <Rotulo>Quem entra hoje</Rotulo>
            <p className="num text-[11px] text-tinta-suave">{pessoas.length}</p>
          </div>
          {carregando ? (
            <p className="px-5 py-10 text-sm text-tinta-suave">Carregando…</p>
          ) : erro ? (
            <p className="border-l-2 border-linha bg-linha-clara px-4 py-3 text-sm text-linha">
              Não consegui carregar quem entra no painel. Ninguém perdeu o acesso — tente de novo
              em instantes.
            </p>
          ) : pessoas.length === 0 ? (
            <Vazio titulo="Ninguém cadastrado ainda." />
          ) : (
            <ul className="divide-y divide-grade">
              {pessoas.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.nome}</p>
                    <p className="num truncate text-xs text-tinta-suave">{p.email}</p>
                  </div>
                  <select
                    value={p.papel}
                    onChange={(e) => trocarPapel(p, e.target.value as Papel)}
                    aria-label={`Acesso de ${p.nome}`}
                    title={EXPLICA_PAPEL[p.papel]}
                    className="campo w-40 shrink-0 py-1 text-xs"
                  >
                    {PAPEIS.map((x) => (
                      <option key={x} value={x}>
                        {ROTULO_PAPEL[x]}
                      </option>
                    ))}
                  </select>
                  <p className="shrink-0 text-right font-mono text-[10px] uppercase tracking-wider text-tinta-suave">
                    {p.ultimo_acesso
                      ? `entrou ${horaDe(p.ultimo_acesso)}`
                      : p.confirmado
                        ? 'nunca entrou'
                        : 'convite pendente'}
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => mandarLinkDeSenha(p)}
                      className="btn btn-secundario px-2.5 py-1 text-xs"
                    >
                      {p.confirmado ? 'Mandar link de senha' : 'Reenviar convite'}
                    </button>
                    <button onClick={() => tirarAcesso(p)} className="btn btn-perigo px-2.5 py-1 text-xs">
                      Tirar acesso
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao>
          <div className="border-b border-grade px-4 py-2.5">
            <Rotulo>Trocar a minha senha</Rotulo>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-48 flex-1">
                <label className="rotulo" htmlFor="minha-senha">
                  Senha nova
                </label>
                <input
                  id="minha-senha"
                  type="password"
                  autoComplete="new-password"
                  value={minhaSenha}
                  onChange={(e) => setMinhaSenha(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && minhaSenha.length >= 8 && trocarMinhaSenha()}
                  className="campo num mt-1"
                  placeholder="pelo menos 8 letras ou números"
                />
              </div>
              <button
                onClick={trocarMinhaSenha}
                disabled={salvando || minhaSenha.length < 8}
                className="btn btn-principal"
              >
                Trocar
              </button>
            </div>
            <Linha className="my-4" />
            <p className="text-xs text-tinta-suave">
              Perdeu o acesso de todo mundo? Dá para criar uma pessoa direto no Supabase, em
              Authentication → Users → Add user.
            </p>
          </div>
        </Cartao>
      </div>
    </>
  );
}
