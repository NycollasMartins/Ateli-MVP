'use client';

import { useEffect, useState } from 'react';
import { useServicos, enviar } from '@/lib/dados';
import { paraCentavos, paraReais } from '@/lib/dinheiro';
import { moeda } from '@/lib/formato';
import type { Servico } from '@/lib/tipos';
import { Cabecalho } from '@/components/Cabecalho';
import { Cartao, Rotulo } from '@/components/ui';
import { useAviso } from '@/components/Avisos';



export default function Precos() {
  const { servicos, carregando, recarregar } = useServicos();
  const [rascunho, setRascunho] = useState<Record<string, Partial<Servico> & { precoTexto?: string }>>({});
  const [novo, setNovo] = useState({ nome: '', categoria: 'Ajustes', preco: '', prazo: '7' });
  const [salvando, setSalvando] = useState(false);
  const avisar = useAviso();

  /**
   * Descarta só o rascunho de serviço que deixou de existir.
   *
   * Antes isto zerava tudo quando a quantidade mudava: corrigir três preços e
   * cadastrar um serviço novo apagava as três correções, sem aviso, e a tabela
   * seguia com os valores velhos.
   */
  useEffect(() => {
    const existentes = new Set(servicos.map((s) => s.id));
    setRascunho((r) => {
      const vivos = Object.keys(r).filter((id) => existentes.has(id));
      if (vivos.length === Object.keys(r).length) return r;
      return Object.fromEntries(vivos.map((id) => [id, r[id]]));
    });
  }, [servicos]);

  const mudar = (id: string, campo: string, valor: unknown) =>
    setRascunho((r) => ({ ...r, [id]: { ...r[id], [campo]: valor } }));

  async function salvar(s: Servico) {
    const mudou = rascunho[s.id];
    if (!mudou) return;
    setSalvando(true);
    try {
      const corpo: Record<string, unknown> = { ...mudou };
      if (mudou.precoTexto !== undefined) {
        corpo.preco_centavos = paraCentavos(mudou.precoTexto);
        delete corpo.precoTexto;
      }
      await enviar(`/api/admin/servicos/${s.id}`, 'PATCH', corpo);
      await recarregar();
      setRascunho((r) => {
        const c = { ...r };
        delete c[s.id];
        return c;
      });
      avisar('Preço atualizado. As clientes já veem o novo valor.');
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function adicionar() {
    if (!novo.nome.trim()) return avisar('Escreva o nome do serviço.', 'erro');
    setSalvando(true);
    try {
      await enviar('/api/admin/servicos', 'POST', {
        nome: novo.nome,
        categoria: novo.categoria,
        preco_centavos: paraCentavos(novo.preco),
        prazo_dias: Number(novo.prazo) || 7,
        ordem: servicos.length + 1,
      });
      setNovo({ nome: '', categoria: novo.categoria, preco: '', prazo: '7' });
      await recarregar();
      avisar('Serviço adicionado à tabela.');
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(s: Servico) {
    try {
      await enviar(`/api/admin/servicos/${s.id}`, 'PATCH', { ativo: !s.ativo });
      await recarregar();
      avisar(s.ativo ? 'Serviço escondido do formulário.' : 'Serviço voltou para o formulário.');
    } catch (e) {
      // sem isto, o clique não fazia nada e não dizia nada
      avisar((e as Error).message, 'erro');
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Tabela de preços"
        apoio="É esta tabela que aparece no formulário do QR e que calcula o valor de cada pedido."
      />

      <div className="space-y-5 px-5 py-6 md:px-8">
        <Cartao className="p-4">
          <Rotulo>Adicionar serviço</Rotulo>
          <div className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr_7rem_6rem_auto]">
            <input
              value={novo.nome}
              onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              aria-label="Nome do serviço novo"
              placeholder="Nome do serviço"
              className="campo"
            />
            <input
              value={novo.categoria}
              onChange={(e) => setNovo({ ...novo, categoria: e.target.value })}
              aria-label="Categoria do serviço novo"
              placeholder="Categoria"
              className="campo"
            />
            <input
              value={novo.preco}
              onChange={(e) => setNovo({ ...novo, preco: e.target.value })}
              aria-label="Preço do serviço novo"
              placeholder="R$ 0,00"
              inputMode="decimal"
              className="campo num"
            />
            <input
              value={novo.prazo}
              onChange={(e) => setNovo({ ...novo, prazo: e.target.value })}
              aria-label="Prazo em dias do serviço novo"
              placeholder="dias"
              inputMode="numeric"
              className="campo num"
            />
            <button onClick={adicionar} disabled={salvando} className="btn btn-principal">
              Adicionar
            </button>
          </div>
        </Cartao>

        <Cartao>
          <div className="hidden gap-3 border-b border-grade px-4 py-2 md:grid md:grid-cols-[2.2fr_1fr_7rem_5rem_9rem]">
            <span className="rotulo">Serviço</span>
            <span className="rotulo">Categoria</span>
            <span className="rotulo">Preço</span>
            <span className="rotulo">Prazo</span>
            <span className="rotulo text-right">Ações</span>
          </div>

          {carregando && <p className="px-4 py-8 text-sm text-tinta-suave">Carregando…</p>}

          <ul className="divide-y divide-grade">
            {servicos.map((s) => {
              const d = rascunho[s.id] ?? {};
              const alterado = Object.keys(d).length > 0;
              return (
                <li
                  key={s.id}
                  className={`grid gap-3 px-4 py-3 md:grid-cols-[2.2fr_1fr_7rem_5rem_9rem] md:items-center ${
                    s.ativo ? '' : 'opacity-50'
                  }`}
                >
                  <input
                    value={(d.nome as string) ?? s.nome}
                    onChange={(e) => mudar(s.id, 'nome', e.target.value)}
                    aria-label={`Nome de ${s.nome}`}
                    className="campo"
                  />
                  <input
                    value={(d.categoria as string) ?? s.categoria}
                    onChange={(e) => mudar(s.id, 'categoria', e.target.value)}
                    aria-label={`Categoria de ${s.nome}`}
                    className="campo"
                  />
                  <input
                    value={d.precoTexto ?? paraReais(s.preco_centavos)}
                    onChange={(e) => mudar(s.id, 'precoTexto', e.target.value)}
                    aria-label={`Preço de ${s.nome}`}
                    inputMode="decimal"
                    className="campo num"
                  />
                  <input
                    value={String((d.prazo_dias as number) ?? s.prazo_dias)}
                    onChange={(e) => mudar(s.id, 'prazo_dias', Number(e.target.value))}
                    aria-label={`Prazo em dias de ${s.nome}`}
                    inputMode="numeric"
                    className="campo num"
                  />
                  <div className="flex justify-end gap-2">
                    {alterado ? (
                      <button onClick={() => salvar(s)} disabled={salvando} className="btn btn-principal py-1.5 text-xs">
                        Salvar
                      </button>
                    ) : (
                      <span className="num self-center text-xs text-tinta-suave">
                        {s.preco_centavos ? moeda(s.preco_centavos) : 'a combinar'}
                      </span>
                    )}
                    <button onClick={() => alternarAtivo(s)} className="btn btn-secundario py-1.5 text-xs">
                      {s.ativo ? 'Esconder' : 'Mostrar'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Cartao>

        <p className="text-xs text-tinta-suave">
          Serviços escondidos somem do formulário das clientes, mas continuam nos pedidos antigos.
        </p>
      </div>
    </>
  );
}
