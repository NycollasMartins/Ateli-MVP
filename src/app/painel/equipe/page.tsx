'use client';

import { useCallback, useEffect, useState } from 'react';
import { enviar, irParaLogin } from '@/lib/dados';
import { horaDe } from '@/lib/formato';
import { Cabecalho } from '@/components/Cabecalho';
import { Cartao, Rotulo, Vazio, Linha } from '@/components/ui';
import { useAviso } from '@/components/Avisos';

type Pessoa = {
  id: string;
  email: string;
  nome: string;
  criado_em: string;
  ultimo_acesso: string | null;
};

/** A senha nova aparece uma vez só; depois disso ninguém consegue lê-la de novo. */
function SenhaNova({ pessoa, senha, aoFechar }: { pessoa: string; senha: string; aoFechar: () => void }) {
  const avisar = useAviso();

  return (
    <div className="border border-fita-escura/40 bg-fita/20 px-4 py-4">
      <p className="text-sm">
        Senha de <strong>{pessoa}</strong>. Anote ou passe agora: esta é a única vez que ela
        aparece.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="num select-all border border-tinta/20 bg-papel px-3 py-2 text-base tracking-wide">
          {senha}
        </code>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(senha);
            avisar('Senha copiada.');
          }}
          className="btn btn-secundario"
        >
          Copiar
        </button>
        <button onClick={aoFechar} className="btn btn-secundario">
          Já anotei
        </button>
      </div>
      <p className="mt-3 text-xs text-tinta-suave">
        Peça para a pessoa entrar e trocar por uma senha dela, aqui mesmo nesta tela.
      </p>
    </div>
  );
}

export default function Equipe() {
  const avisar = useAviso();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nova, setNova] = useState({ nome: '', email: '' });
  const [minhaSenha, setMinhaSenha] = useState('');
  const [revelada, setRevelada] = useState<{ pessoa: string; senha: string } | null>(null);

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
      const { senha } = await enviar<{ senha: string }>('/api/admin/equipe', 'POST', nova);
      setRevelada({ pessoa: nova.nome.trim(), senha });
      setNova({ nome: '', email: '' });
      await recarregar();
      avisar('Acesso criado.');
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function novaSenha(p: Pessoa) {
    if (!window.confirm(`Gerar uma senha nova para ${p.nome}? A senha atual para de funcionar.`)) return;
    try {
      const { senha } = await enviar<{ senha: string }>(`/api/admin/equipe/${p.id}/senha`, 'POST');
      setRevelada({ pessoa: p.nome, senha });
    } catch (e) {
      avisar((e as Error).message, 'erro');
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
        {revelada && (
          <SenhaNova
            pessoa={revelada.pessoa}
            senha={revelada.senha}
            aoFechar={() => setRevelada(null)}
          />
        )}

        <Cartao>
          <div className="border-b border-grade px-4 py-2.5">
            <Rotulo>Dar acesso a alguém</Rotulo>
          </div>
          <div className="grid gap-2 bg-papel-fundo p-3 sm:grid-cols-[1fr_1fr_auto]">
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
            <button onClick={adicionar} disabled={salvando} className="btn btn-principal">
              Criar acesso
            </button>
          </div>
          <p className="px-4 py-2.5 text-xs text-tinta-suave">
            Sai uma senha temporária na tela, para você passar para a pessoa. Nenhum e-mail é
            enviado.
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
                  <p className="shrink-0 text-right font-mono text-[10px] uppercase tracking-wider text-tinta-suave">
                    {p.ultimo_acesso ? `entrou ${horaDe(p.ultimo_acesso)}` : 'nunca entrou'}
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => novaSenha(p)} className="btn btn-secundario px-2.5 py-1 text-xs">
                      Nova senha
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
