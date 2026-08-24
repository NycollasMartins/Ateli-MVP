import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { balancoDoPeriodo, despesasEntre, entregasEntre } from '../src/lib/financeiro.ts';
import { periodoDe } from '../src/lib/periodo.ts';
import type { Despesa, Pedido, Status } from '../src/lib/tipos.ts';

const AGOSTO = new Date(2026, 7, 20, 12);

const entrega = (valor: number, quando: string, id = String(Math.random())): Pedido => ({
  id, codigo: 'AT-' + id, cliente_nome: 'Ana', cliente_telefone: '11987654321',
  cliente_email: null, cliente_ramal: null, peca: 'Calça', descricao: null, observacoes: null, urgente: false, urgente_perfil: null, acrescimo_centavos: 0,
  status: 'entregue' as Status, retirada_em: null, retirada_hora: null,
  valor_centavos: valor, sinal_centavos: 0, pago: true, pago_em: null, forma_pagamento: 'Pix',
  entregue_em: quando, google_event_id: null, criado_em: '', atualizado_em: '',
});

const gasto = (valor: number, data: string): Despesa => ({
  id: String(Math.random()), descricao: 'x', categoria: 'Materiais', valor_centavos: valor,
  data, observacao: null, despesa_fixa_id: null, competencia: null, criado_em: '',
});

describe('lucro é receita menos despesa do mesmo período', () => {
  test('conta o que está dentro e ignora o que está fora', () => {
    const b = balancoDoPeriodo(
      [entrega(10000, '2026-08-05T10:00:00'), entrega(30000, '2026-07-20T10:00:00')],
      [gasto(4000, '2026-08-10'), gasto(90000, '2026-07-01')],
      periodoDe(AGOSTO, 'mes', 0)
    );
    assert.equal(b.receita, 10000);
    assert.equal(b.gasto, 4000);
    assert.equal(b.lucro, 6000);
  });

  test('prejuízo aparece como número negativo', () => {
    const b = balancoDoPeriodo([], [gasto(5000, '2026-08-10')], periodoDe(AGOSTO, 'mes', 0));
    assert.equal(b.lucro, -5000);
  });
});

describe('as pontas do período entram', () => {
  const mes = periodoDe(AGOSTO, 'mes', 0);

  test('despesa do primeiro e do último dia contam', () => {
    for (const dia of ['2026-08-01', '2026-08-31']) {
      assert.equal(despesasEntre([gasto(100, dia)], mes.ini, mes.fim).length, 1, dia);
    }
  });

  test('despesa de fora não conta', () => {
    for (const dia of ['2026-07-31', '2026-09-01']) {
      assert.equal(despesasEntre([gasto(100, dia)], mes.ini, mes.fim).length, 0, dia);
    }
  });

  test('coluna de data com hora colada não perde a despesa do último dia', () => {
    // se o banco devolvesse "2026-08-31T00:00:00", comparar texto cru jogaria
    // a despesa do último dia para fora do mês, em silêncio
    assert.equal(despesasEntre([gasto(100, '2026-08-31T00:00:00')], mes.ini, mes.fim).length, 1);
  });

  test('entrega no último instante do mês conta', () => {
    assert.equal(entregasEntre([entrega(100, '2026-08-31T23:59:59')], mes.ini, mes.fim).length, 1);
  });

  test('varredura: todo dia de agosto cai dentro, e nenhum de julho ou setembro', () => {
    for (let d = 1; d <= 31; d++) {
      const dia = `2026-08-${String(d).padStart(2, '0')}`;
      assert.equal(despesasEntre([gasto(1, dia)], mes.ini, mes.fim).length, 1, dia);
    }
    for (const fora of ['2026-07-30', '2026-07-31', '2026-09-01', '2026-09-02']) {
      assert.equal(despesasEntre([gasto(1, fora)], mes.ini, mes.fim).length, 0, fora);
    }
  });
});

describe('o ticket médio', () => {
  test('é a receita dividida pelas entregas', () => {
    const b = balancoDoPeriodo(
      [entrega(10000, '2026-08-05T10:00:00'), entrega(20000, '2026-08-06T10:00:00')],
      [], periodoDe(AGOSTO, 'mes', 0)
    );
    assert.equal(b.ticket, 15000);
  });

  test('sem entrega, não divide por zero', () => {
    const b = balancoDoPeriodo([], [], periodoDe(AGOSTO, 'mes', 0));
    assert.equal(b.ticket, 0);
  });
});

describe('a variação só existe quando dá para comparar', () => {
  const comLucroEm = (mesIso: string, receita: number) =>
    entrega(receita, `${mesIso}-15T10:00:00`);

  test('compara com o período anterior ao escolhido', () => {
    const b = balancoDoPeriodo(
      [comLucroEm('2026-08', 20000), comLucroEm('2026-07', 10000)],
      [], periodoDe(AGOSTO, 'mes', 0)
    );
    assert.equal(b.variacao, 100);
  });

  test('olhando julho, compara com junho — não com agosto', () => {
    const b = balancoDoPeriodo(
      [comLucroEm('2026-08', 99999), comLucroEm('2026-07', 20000), comLucroEm('2026-06', 10000)],
      [], periodoDe(AGOSTO, 'mes', 1)
    );
    assert.equal(b.variacao, 100, 'a comparação escapou para o mês corrente');
  });

  test('período anterior sem lucro não vira porcentagem', () => {
    // "+900%" porque o mês passado deu um real é pior que não mostrar nada
    const semAnterior = balancoDoPeriodo([comLucroEm('2026-08', 20000)], [], periodoDe(AGOSTO, 'mes', 0));
    assert.equal(semAnterior.variacao, null);

    const anteriorNoVermelho = balancoDoPeriodo(
      [comLucroEm('2026-08', 20000)],
      [gasto(50000, '2026-07-10')],
      periodoDe(AGOSTO, 'mes', 0)
    );
    assert.equal(anteriorNoVermelho.variacao, null);
  });

  test('queda aparece como negativo', () => {
    const b = balancoDoPeriodo(
      [comLucroEm('2026-08', 5000), comLucroEm('2026-07', 10000)],
      [], periodoDe(AGOSTO, 'mes', 0)
    );
    assert.equal(b.variacao, -50);
  });
});

describe('só entrega registrada vira receita', () => {
  test('nenhum outro estado entra na conta', () => {
    const naBancada = (['novo', 'agendado', 'pronto', 'cancelado'] as Status[]).map((s) => ({
      ...entrega(50000, '2026-08-10T10:00:00'),
      status: s,
    }));
    const b = balancoDoPeriodo(naBancada, [], periodoDe(AGOSTO, 'mes', 0));
    assert.equal(b.receita, 0);
  });

  test('entregue sem data de entrega também não', () => {
    const b = balancoDoPeriodo(
      [{ ...entrega(50000, '2026-08-10T10:00:00'), entregue_em: null }],
      [], periodoDe(AGOSTO, 'mes', 0)
    );
    assert.equal(b.receita, 0);
  });
});
