import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { agruparClientes, chaveTelefone, anterioresA, ordemDoPedido } from '../src/lib/clientes.ts';
import type { Pedido, Status } from '../src/lib/tipos.ts';

function pedido(p: Partial<Pedido> & { id: string }): Pedido {
  return {
    codigo: 'AT-' + p.id,
    cliente_nome: 'Ana Souza',
    cliente_telefone: '11987654321',
    cliente_email: null,
    peca: 'Calça',
    descricao: null,
    observacoes: null,
    urgente: false,
    status: 'novo' as Status,
    retirada_em: null,
    retirada_hora: '10:00',
    valor_centavos: 0,
    sinal_centavos: 0,
    pago: false,
    pago_em: null,
    forma_pagamento: null,
    entregue_em: null,
    google_event_id: null,
    criado_em: '2026-01-01T10:00:00Z',
    atualizado_em: '2026-01-01T10:00:00Z',
    ...p,
  };
}

describe('a mesma pessoa é reconhecida em qualquer formato de telefone', () => {
  test('celular: todo jeito de escrever cai na mesma cliente', () => {
    // varridos os formatos que brasileiro digita de verdade, incluindo o 0
    // antes do DDD — é assim que se disca interurbano e que muita gente anota
    const formatos = [
      '11987654321',
      '(11) 98765-4321',
      '11 98765 4321',
      '+55 11 98765-4321',
      '5511987654321',
      '011 98765-4321',
      '(011) 98765-4321',
      '11 9 8765-4321',
      '+55 (11) 98765-4321',
      '55 11 98765 4321',
      '+5511987654321',
      '55011987654321',
    ];
    const chaves = new Set(formatos.map(chaveTelefone));
    assert.equal(
      chaves.size,
      1,
      `a mesma pessoa virou ${chaves.size} clientes: ${[...chaves].join(', ')}`
    );
    assert.equal([...chaves][0], '11987654321');
  });

  test('fixo também', () => {
    const chaves = new Set(
      ['1133334444', '(11) 3333-4444', '011 3333-4444', '551133334444'].map(chaveTelefone)
    );
    assert.equal(chaves.size, 1, `virou ${chaves.size} clientes: ${[...chaves].join(', ')}`);
  });

  test('telefones de verdade diferentes continuam separados', () => {
    assert.notEqual(chaveTelefone('11987654321'), chaveTelefone('21999990000'));
  });

  test('telefone vazio não junta gente aleatória', () => {
    const clientes = agruparClientes([
      pedido({ id: '1', cliente_telefone: '', cliente_nome: 'Sem telefone' }),
      pedido({ id: '2', cliente_telefone: '   ', cliente_nome: 'Outra' }),
    ]);
    assert.equal(clientes.length, 0);
  });
});

describe('pedido cancelado não conta como visita', () => {
  const pedidos = [
    pedido({ id: '1', status: 'entregue', valor_centavos: 7000, entregue_em: '2026-03-02T10:00:00Z', criado_em: '2026-03-02T10:00:00Z' }),
    pedido({ id: '2', status: 'entregue', valor_centavos: 4000, entregue_em: '2026-05-10T10:00:00Z', criado_em: '2026-05-10T10:00:00Z' }),
    pedido({ id: '3', status: 'agendado', valor_centavos: 12000, sinal_centavos: 5000, criado_em: '2026-08-01T10:00:00Z' }),
    pedido({ id: '4', status: 'cancelado', valor_centavos: 99900, criado_em: '2026-08-05T10:00:00Z' }),
  ];

  test('a contagem de visitas ignora o cancelado', () => {
    const [c] = agruparClientes(pedidos);
    assert.equal(c.visitas, 3, 'o cancelado virou uma visita');
    assert.equal(c.pedidos.length, 4, 'o cancelado sumiu da ficha, mas devia aparecer');
  });

  test('o cancelado não entra no que ela já gastou', () => {
    const [c] = agruparClientes(pedidos);
    assert.equal(c.totalGasto, 11000);
  });

  test('a receber desconta o sinal já deixado', () => {
    const [c] = agruparClientes(pedidos);
    assert.equal(c.aReceber, 7000);
  });

  test('"já trouxe antes" só olha para trás, e sem cancelado', () => {
    const terceiro = pedidos.find((p) => p.id === '3')!;
    assert.deepEqual(anterioresA(terceiro, pedidos).map((p) => p.id), ['2', '1']);
    assert.equal(ordemDoPedido(terceiro, pedidos), 3);
  });

  test('o primeiro pedido de alguém é a 1ª vez', () => {
    const primeiro = pedidos.find((p) => p.id === '1')!;
    assert.equal(ordemDoPedido(primeiro, pedidos), 1);
    assert.deepEqual(anterioresA(primeiro, pedidos), []);
  });
});
