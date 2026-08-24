import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { textoParaCliente, jaAvisada, CHAVE_AVISO } from '../src/lib/mensagens.ts';
import type { Pedido, Status } from '../src/lib/tipos.ts';

function pedido(p: Partial<Pedido>): Pedido {
  return {
    id: '1', codigo: 'AT-001', cliente_nome: 'Ana Beatriz Souza',
    cliente_telefone: '11987654321', cliente_email: null,
    peca: 'Calça', descricao: null, observacoes: null, urgente: false,
    status: 'agendado' as Status, retirada_em: '2026-08-27', retirada_hora: '10:00',
    valor_centavos: 7000, sinal_centavos: 0, pago: false, pago_em: null,
    forma_pagamento: null, entregue_em: null, google_event_id: null,
    criado_em: '2026-08-01T10:00:00Z', atualizado_em: '2026-08-01T10:00:00Z',
    ...p,
  };
}

describe('a mensagem sai em português correto', () => {
  // Estes textos vão para clientes de verdade. Erro de concordância aqui é
  // visível para quem paga, e nenhum compilador pega.
  test('peça masculina concorda no masculino', () => {
    const t = textoParaCliente(pedido({ peca: 'Vestido' }), 'marcada', 'Ateliê da Rosa');
    assert.match(t, /Seu vestido fica pronto/);
    assert.doesNotMatch(t, /vestido fica pronta/);
  });

  test('peça feminina concorda no feminino', () => {
    const t = textoParaCliente(pedido({ peca: 'Calça' }), 'marcada', 'Ateliê da Rosa');
    assert.match(t, /Sua calça fica pronta/);
  });

  test('peça pronta concorda também', () => {
    const t = textoParaCliente(pedido({ peca: 'Vestido de noiva' }), 'pronta', 'X');
    assert.match(t, /já está pronto/);
    assert.doesNotMatch(t, /já está pronta/);
  });

  test('começo de frase vai com maiúscula', () => {
    const t = textoParaCliente(pedido({}), 'marcada', 'Ateliê da Rosa');
    assert.doesNotMatch(t, /\. [a-zà-ú]/u, `frase começando em minúscula: ${t}`);
  });

  test('peça ambígua não recebe nome errado de roupa', () => {
    const t = textoParaCliente(pedido({ peca: 'Camisa ou blusa' }), 'marcada', 'X');
    assert.match(t, /Sua peça/);
  });

  test('no meio da frase, fica minúscula', () => {
    const t = textoParaCliente(pedido({ peca: 'Saia' }), 'vespera', 'X');
    assert.match(t, /lembrar que sua saia fica pronta amanhã/);
  });
});

describe('a mensagem fala de dinheiro do jeito certo', () => {
  test('com sinal, diz quanto falta', () => {
    const t = textoParaCliente(
      pedido({ valor_centavos: 12000, sinal_centavos: 5000 }), 'marcada', 'X'
    );
    assert.match(t, /falta R\$\s?70,00/);
  });

  test('sem valor definido, não inventa preço', () => {
    const t = textoParaCliente(pedido({ valor_centavos: 0 }), 'marcada', 'X');
    assert.doesNotMatch(t, /R\$/);
  });

  test('o nome do ateliê entra na apresentação', () => {
    assert.match(textoParaCliente(pedido({}), 'marcada', 'Ateliê da Rosa'), /do Ateliê da Rosa/);
  });

  test('nome de uma palavra só não quebra', () => {
    assert.match(textoParaCliente(pedido({ cliente_nome: 'Rita' }), 'pronta', 'X'), /^Oi Rita!/);
  });
});

describe('não cobra duas vezes o mesmo aviso', () => {
  test('reconhece o aviso já dado', () => {
    const p = pedido({ notificacoes: [{ tipo: CHAVE_AVISO.vespera }] });
    assert.equal(jaAvisada(p, 'vespera'), true);
    assert.equal(jaAvisada(p, 'marcada'), false);
  });

  test('lembrete do cron não conta como mensagem de WhatsApp', () => {
    const p = pedido({ notificacoes: [{ tipo: '24h' }] });
    assert.equal(jaAvisada(p, 'vespera'), false);
  });
});
