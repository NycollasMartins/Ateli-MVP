import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { linhasDoExtrato, extratoEmCSV, nomeDoArquivo, COLUNAS } from '../src/lib/extrato.ts';
import type { Despesa, Pedido, Status } from '../src/lib/tipos.ts';

const entrega = (codigo: string, valor: number, quando: string, extra: Partial<Pedido> = {}): Pedido => ({
  id: codigo, codigo, cliente_nome: 'Ana Souza', cliente_telefone: '11987654321',
  cliente_email: null, peca: 'Calça', descricao: null, observacoes: null, urgente: false,
  status: 'entregue' as Status, retirada_em: null, retirada_hora: null,
  valor_centavos: valor, sinal_centavos: 0, pago: true, pago_em: null, forma_pagamento: 'Pix',
  entregue_em: quando, google_event_id: null, criado_em: '', atualizado_em: '', ...extra,
});

const gasto = (descricao: string, valor: number, data: string): Despesa => ({
  id: descricao, descricao, categoria: 'Materiais', valor_centavos: valor,
  data, observacao: null, despesa_fixa_id: null, competencia: null, criado_em: '',
});

describe('o extrato junta entradas e saídas numa lista só', () => {
  test('entrega vira entrada positiva; despesa vira saída negativa', () => {
    const [entrada, saida] = linhasDoExtrato(
      [entrega('AT-1', 7000, '2026-08-10T14:00:00')],
      [gasto('Zíper', 3150, '2026-08-10')]
    );
    assert.deepEqual(entrada, ['Entrada', '10/08/2026', 'Pedido AT-1 — Calça', 'Ana Souza', 'Pix', '70,00']);
    assert.deepEqual(saida, ['Saída', '10/08/2026', 'Zíper', '', 'Materiais', '-31,50']);
  });

  test('período vazio não gera linha', () => {
    assert.deepEqual(linhasDoExtrato([], []), []);
  });

  test('sem forma de pagamento, a coluna fica vazia — não "null"', () => {
    const [linha] = linhasDoExtrato([entrega('AT-1', 100, '2026-08-10T10:00:00', { forma_pagamento: null })], []);
    assert.equal(linha[4], '');
  });
});

describe('a ordem do arquivo é estável', () => {
  // baixar o mesmo período duas vezes tem que dar exatamente o mesmo arquivo,
  // senão quem compara dois extratos vê diferença onde não houve nenhuma
  const entregas = [
    entrega('AT-3', 300, '2026-08-12T10:00:00'),
    entrega('AT-1', 100, '2026-08-10T18:00:00'),
    entrega('AT-2', 200, '2026-08-10T09:00:00'),
  ];
  const gastos = [gasto('Tecido', 50, '2026-08-10'), gasto('Agulha', 20, '2026-08-10')];

  test('ordena por dia, entrada antes de saída, depois pelo nome', () => {
    const ordem = linhasDoExtrato(entregas, gastos).map((l) => l[2]);
    assert.deepEqual(ordem, [
      'Pedido AT-1 — Calça',
      'Pedido AT-2 — Calça',
      'Agulha',
      'Tecido',
      'Pedido AT-3 — Calça',
    ]);
  });

  test('embaralhar a entrada não muda o arquivo', () => {
    const referencia = extratoEmCSV(entregas, gastos);
    for (let i = 0; i < 20; i++) {
      const e = [...entregas].sort(() => (i % 2 ? 1 : -1));
      const g = [...gastos].reverse();
      assert.equal(extratoEmCSV(e, g), referencia, 'a ordem do arquivo mudou sem o dado mudar');
    }
  });
});

describe('o arquivo abre certo do outro lado', () => {
  test('traz o cabeçalho e uma linha por lançamento', () => {
    const csv = extratoEmCSV([entrega('AT-1', 100, '2026-08-10T10:00:00')], [gasto('x', 50, '2026-08-11')]);
    const linhas = csv.replace(/^﻿/, '').trim().split('\r\n');
    assert.equal(linhas.length, 3);
    assert.equal(linhas[0], COLUNAS.join(';'));
  });

  test('data com hora colada entra no dia certo e na ordem certa', () => {
    // o texto cru "2026-08-31T00:00:00" ordena depois de "2026-08-31", então
    // uma despesa assim se separaria das outras do mesmo dia
    const linhas = linhasDoExtrato(
      [entrega('AT-9', 100, '2026-08-31T09:00:00')],
      [gasto('Aluguel', 90000, '2026-08-31T00:00:00'), gasto('Zíper', 500, '2026-09-01')]
    );
    assert.deepEqual(
      linhas.map((l) => [l[0], l[1]]),
      [
        ['Entrada', '31/08/2026'],
        ['Saída', '31/08/2026'],
        ['Saída', '01/09/2026'],
      ]
    );
  });

  test('o nome do arquivo diz o período', () => {
    assert.equal(
      nomeDoArquivo(new Date(2026, 7, 1, 12), new Date(2026, 7, 31, 12)),
      'atelie-2026-08-01-a-2026-08-31.csv'
    );
  });
});
