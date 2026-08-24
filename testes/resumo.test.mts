import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resumoDoPainel } from '../src/lib/resumo.ts';
import { isoDia } from '../src/lib/formato.ts';
import type { Pedido, Status } from '../src/lib/tipos.ts';

const QUINTA = new Date(2026, 7, 20, 12); // 20/08/2026, semana de 17 a 23

const dia = (n: number) => {
  const d = new Date(QUINTA);
  d.setDate(d.getDate() + n);
  return isoDia(d);
};

function pedido(p: Partial<Pedido> & { id: string }): Pedido {
  return {
    codigo: 'AT-' + p.id, cliente_nome: 'Ana', cliente_telefone: '11987654321',
    cliente_email: null, peca: 'Calça', descricao: null, observacoes: null, urgente: false,
    status: 'agendado' as Status, retirada_em: dia(2), retirada_hora: '10:00',
    valor_centavos: 10000, sinal_centavos: 0, pago: false, pago_em: null, forma_pagamento: null,
    entregue_em: null, google_event_id: null, criado_em: '', atualizado_em: '', ...p,
  };
}

describe('o caixa da semana só conta entrega da semana', () => {
  test('entrega de hoje conta; da semana passada, não', () => {
    const r = resumoDoPainel(
      [
        pedido({ id: '1', status: 'entregue', valor_centavos: 7000, entregue_em: `${dia(0)}T14:00:00` }),
        pedido({ id: '2', status: 'entregue', valor_centavos: 5000, entregue_em: `${dia(-9)}T14:00:00` }),
      ],
      QUINTA
    );
    assert.equal(r.caixaSemana, 7000);
    assert.equal(r.qtdSemana, 1);
  });

  test('a segunda e o domingo da semana entram; a segunda seguinte não', () => {
    // as pontas da semana comercial são onde este tipo de conta costuma vazar
    const nas = (iso: string) =>
      resumoDoPainel(
        [pedido({ id: 'x', status: 'entregue', valor_centavos: 100, entregue_em: iso })],
        QUINTA
      ).qtdSemana;

    assert.equal(nas('2026-08-17T00:00:01'), 1, 'segunda de manhã ficou de fora');
    assert.equal(nas('2026-08-23T23:59:00'), 1, 'domingo à noite ficou de fora');
    assert.equal(nas('2026-08-16T23:59:00'), 0, 'domingo anterior entrou');
    assert.equal(nas('2026-08-24T00:00:01'), 0, 'segunda seguinte entrou');
  });

  test('entregue sem data de entrega não conta', () => {
    const r = resumoDoPainel([pedido({ id: '1', status: 'entregue', entregue_em: null })], QUINTA);
    assert.equal(r.qtdSemana, 0);
  });
});

describe('a bancada e o que falta receber', () => {
  test('só agendado e pronto ocupam a bancada', () => {
    const ps = (['novo', 'agendado', 'pronto', 'entregue', 'cancelado'] as Status[]).map((s, i) =>
      pedido({ id: String(i), status: s, entregue_em: s === 'entregue' ? `${dia(0)}T10:00:00` : null })
    );
    const r = resumoDoPainel(ps, QUINTA);
    assert.equal(r.naBancada.length, 2);
    assert.equal(r.novos.length, 1);
  });

  test('a receber desconta o sinal', () => {
    const r = resumoDoPainel(
      [pedido({ id: '1', valor_centavos: 12000, sinal_centavos: 5000 })],
      QUINTA
    );
    assert.equal(r.aReceber, 7000);
    assert.equal(r.sinaisNaMao, 5000);
  });
});

describe('peça atrasada aparece e é contada', () => {
  test('o que passou do dia entra nas próximas e nas atrasadas', () => {
    const r = resumoDoPainel(
      [
        pedido({ id: 'atrasada', retirada_em: dia(-4) }),
        pedido({ id: 'hoje', retirada_em: dia(0) }),
        pedido({ id: 'depois', retirada_em: dia(9) }),
      ],
      QUINTA
    );
    assert.deepEqual(r.proximas.map((p) => p.id), ['atrasada', 'hoje']);
    assert.deepEqual(r.atrasadas.map((p) => p.id), ['atrasada']);
    assert.deepEqual(r.hojeEntregas.map((p) => p.id), ['hoje']);
  });

  test('quem espera há mais tempo vem primeiro', () => {
    const r = resumoDoPainel(
      [
        pedido({ id: 'b', retirada_em: dia(-2) }),
        pedido({ id: 'c', retirada_em: dia(1) }),
        pedido({ id: 'a', retirada_em: dia(-11) }),
      ],
      QUINTA
    );
    assert.deepEqual(r.proximas.map((p) => p.id), ['a', 'b', 'c']);
  });

  test('varredura: todo atraso de 1 a 120 dias continua visível', () => {
    for (let d = 1; d <= 120; d++) {
      const r = resumoDoPainel([pedido({ id: 'x', retirada_em: dia(-d) })], QUINTA);
      assert.equal(r.atrasadas.length, 1, `${d} dias de atraso sumiu`);
      assert.equal(r.proximas.length, 1, `${d} dias de atraso saiu da lista`);
    }
  });

  test('pedido sem data não entra em nenhuma lista de prazo', () => {
    const r = resumoDoPainel([pedido({ id: '1', status: 'novo', retirada_em: null })], QUINTA);
    assert.deepEqual([r.proximas, r.atrasadas, r.hojeEntregas], [[], [], []]);
  });
});
