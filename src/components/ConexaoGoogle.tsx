'use client';

import { useCallback, useEffect, useState } from 'react';
import { enviar } from '@/lib/dados';
import { useAviso } from '@/components/Avisos';
import { useEhAdmin } from '@/components/Papel';

type Conexao = {
  conectada: boolean;
  configurado: boolean;
  client_id: string;
  voltar_para: string;
};

/**
 * O bloco do Google Agenda, na tela de Agenda.
 *
 * As credenciais entram por aqui e ficam no banco. Antes só existiam no
 * arquivo `.env`, o que obrigava a mexer no código e republicar o sistema para
 * ligar a agenda — que é justamente o que quem usa o painel não faz.
 *
 * A chave secreta nunca volta do servidor: o que a tela sabe é se existe ou
 * não. Por isso o campo aparece sempre vazio, mesmo com tudo configurado.
 */
export function ConexaoGoogle() {
  const [conexao, setConexao] = useState<Conexao | null>(null);
  const [erro, setErro] = useState(false);
  const [abrindoForm, setAbrindoForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [credenciais, setCredenciais] = useState({ client_id: '', client_secret: '' });
  const avisar = useAviso();
  const ehAdmin = useEhAdmin();

  const recarregar = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/agenda', { cache: 'no-store' });
      setConexao(await r.json());
      setErro(false);
    } catch {
      // sem isto, nem o aviso de conectar nem o de conectado apareciam, e ela
      // ficava sem saber que as retiradas pararam de ir para o Google
      setErro(true);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function guardar() {
    setSalvando(true);
    try {
      await enviar('/api/admin/agenda', 'PUT', credenciais);
      setCredenciais({ client_id: '', client_secret: '' });
      setAbrindoForm(false);
      await recarregar();
      avisar('Credenciais guardadas. Agora é só conectar.');
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function desconectar(tudo: boolean) {
    const pergunta = tudo
      ? 'Esquecer as credenciais e desconectar? Para ligar de novo você vai precisar colá-las outra vez.'
      : 'Desconectar a conta do Google? As retiradas param de ir para a agenda até você conectar de novo.';
    if (!window.confirm(pergunta)) return;

    try {
      await enviar(`/api/admin/agenda${tudo ? '?tudo=1' : ''}`, 'DELETE');
      await recarregar();
      avisar(tudo ? 'Credenciais esquecidas.' : 'Conta do Google desconectada.');
    } catch (e) {
      avisar((e as Error).message, 'erro');
    }
  }

  if (erro) {
    return (
      <div className="border-l-2 border-linha bg-linha-clara px-4 py-3 text-sm text-linha">
        Não consegui conferir se o Google Agenda está conectado. As retiradas continuam salvas
        aqui; confira esta tela de novo em instantes.
      </div>
    );
  }

  if (!conexao) return null;

  return (
    <div className="border border-grade bg-papel">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm">
            {conexao.conectada
              ? 'Google Agenda conectado · cada retirada vira um evento com os dados da cliente, com aviso 3 dias antes e 24 horas antes.'
              : conexao.configurado
                ? 'Falta conectar a conta do Google. Sem isso, as retiradas ficam só aqui dentro.'
                : 'A agenda ainda não está ligada ao Google. Preencha as credenciais abaixo, uma vez só.'}
          </p>
          {conexao.configurado && conexao.client_id && (
            <p className="num mt-1 truncate text-[11px] text-tinta-suave">{conexao.client_id}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {conexao.configurado && (
            <a href="/api/google/iniciar" className={conexao.conectada ? 'btn btn-secundario' : 'btn btn-principal'}>
              {conexao.conectada ? 'Trocar de conta' : 'Conectar Google Agenda'}
            </a>
          )}
          {ehAdmin && conexao.conectada && (
            <button onClick={() => desconectar(false)} className="btn btn-secundario">
              Desconectar
            </button>
          )}
          {ehAdmin && (
            <button onClick={() => setAbrindoForm(!abrindoForm)} className="btn btn-secundario">
              {conexao.configurado ? 'Credenciais' : 'Preencher credenciais'}
            </button>
          )}
        </div>
      </div>

      {ehAdmin && abrindoForm && (
        <div className="border-t border-grade bg-papel-fundo px-4 py-4">
          <p className="text-xs leading-relaxed text-tinta-suave">
            No <span className="font-medium">console.cloud.google.com</span>: ative a Google
            Calendar API, crie um ID de cliente OAuth do tipo Aplicativo da Web e cadastre este
            endereço de retorno, exatamente assim:
          </p>
          <code className="num mt-2 block select-all break-all border border-tinta/20 bg-papel px-3 py-2 text-xs">
            {conexao.voltar_para}
          </code>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={credenciais.client_id}
              onChange={(e) => setCredenciais({ ...credenciais, client_id: e.target.value })}
              aria-label="ID do cliente do Google"
              placeholder="ID do cliente"
              className="campo"
            />
            <input
              type="password"
              value={credenciais.client_secret}
              onChange={(e) => setCredenciais({ ...credenciais, client_secret: e.target.value })}
              aria-label="Chave secreta do cliente do Google"
              placeholder={conexao.configurado ? 'chave secreta (guardada)' : 'chave secreta'}
              className="campo"
            />
            <button onClick={guardar} disabled={salvando} className="btn btn-principal">
              Guardar
            </button>
          </div>

          {conexao.configurado && (
            <button
              onClick={() => desconectar(true)}
              className="btn btn-perigo mt-3 px-2.5 py-1 text-xs"
            >
              Esquecer as credenciais
            </button>
          )}
        </div>
      )}
    </div>
  );
}
