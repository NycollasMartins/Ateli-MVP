'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pedido, Servico, Fechamento, Despesa, DespesaFixa } from './tipos';

/**
 * Sessão morreu: manda para o login recarregando a página inteira.
 *
 * É de propósito não usar o router do Next aqui. Navegação de dentro do app
 * manteria em memória os pedidos e as fotos de quem acabou de perder o acesso;
 * recarregar limpa tudo.
 */
export function irParaLogin() {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = '/login';
}

/**
 * Toda lista que chega do servidor entra com `?? []`.
 *
 * Uma resposta sem a lista faria o `.filter()` estourar durante o render, e
 * sem rede embaixo isso vira tela branca com erro em inglês. Lista vazia com
 * o aviso de falha ao lado é ruim; tela branca é pior.
 */
async function pegar<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' });
  if (r.status === 401) {
    irParaLogin();
    throw new Error('sessão expirada');
  }
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro ?? 'Não foi possível carregar');
  return r.json();
}

export async function enviar<T>(url: string, metodo: string, corpo?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: metodo,
    headers: { 'content-type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro ?? 'Não deu certo. Tente de novo.');
  return dados as T;
}

/** Lista de pedidos com atualização automática. Avisa quando chega pedido novo. */
export function usePedidos(intervalo = 12_000) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [chegaram, setChegaram] = useState<Pedido[]>([]);
  const conhecidos = useRef<Set<string> | null>(null);

  const buscando = useRef(false);

  const recarregar = useCallback(async () => {
    // conexão ruim faria as buscas empilharem, cada uma baixando a lista toda
    if (buscando.current) return;
    buscando.current = true;
    try {
      const { pedidos: lista } = await pegar<{ pedidos: Pedido[] }>('/api/admin/pedidos');
      setPedidos(lista ?? []);
      setErro(null);
      if (conhecidos.current === null) {
        conhecidos.current = new Set(lista.map((p) => p.id));
      } else {
        const novos = lista.filter((p) => !conhecidos.current!.has(p.id));
        novos.forEach((p) => conhecidos.current!.add(p.id));
        if (novos.length) setChegaram((c) => [...novos, ...c]);
      }
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      buscando.current = false;
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();

    // Só busca com a aba à vista. Sem isto, um painel esquecido aberto num
    // celular baixa a lista inteira a cada 12 segundos o dia todo — centenas
    // de megabytes por hora de dados móveis, sem ninguém olhando.
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') recarregar();
    }, intervalo);

    // ao voltar para a aba, atualiza na hora em vez de esperar o intervalo
    const aoVoltar = () => document.visibilityState === 'visible' && recarregar();
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [recarregar, intervalo]);

  return { pedidos, carregando, erro, recarregar, chegaram, limparChegaram: () => setChegaram([]) };
}

export function useServicos(publico = false) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const recarregar = useCallback(async () => {
    try {
      const { servicos: s } = await pegar<{ servicos: Servico[] }>(
        publico ? '/api/publico/servicos' : '/api/admin/servicos'
      );
      setServicos(s ?? []);
      setErro(false);
    } catch {
      // quem lê o QR precisa saber que a lista não carregou; lista vazia e
      // calada faz a cliente achar que o ateliê não faz nada
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [publico]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { servicos, carregando, erro, recarregar };
}

export function useDespesas() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const recarregar = useCallback(async () => {
    const { despesas: d } = await pegar<{ despesas: Despesa[] }>('/api/admin/despesas');
    setDespesas(d ?? []);
    setCarregando(false);
  }, []);
  useEffect(() => {
    recarregar().catch(() => setCarregando(false));
  }, [recarregar]);
  return { despesas, carregando, recarregar };
}

export function useDespesasFixas() {
  const [fixas, setFixas] = useState<DespesaFixa[]>([]);
  const [erro, setErro] = useState(false);

  const recarregar = useCallback(async () => {
    try {
      const { fixas: f } = await pegar<{ fixas: DespesaFixa[] }>('/api/admin/despesas-fixas');
      setFixas(f ?? []);
      setErro(false);
    } catch {
      // lista vazia e calada faria ela achar que não cadastrou nada
      setErro(true);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { fixas, erro, recarregar };
}

export function useFechamentos() {
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [erro, setErro] = useState(false);

  const recarregar = useCallback(async () => {
    try {
      const { fechamentos: f } = await pegar<{ fechamentos: Fechamento[] }>('/api/admin/fechamentos');
      setFechamentos(f ?? []);
      setErro(false);
    } catch {
      // histórico vazio parecendo verdade faria ela achar que nunca fechou o caixa
      setErro(true);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { fechamentos, erro, recarregar };
}
