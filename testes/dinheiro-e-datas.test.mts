import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  inicioSemana,
  fimSemana,
  dataLocal,
  isoDia,
  moeda,
  diasAte,
  prazoEmPalavras,
  prazoDoServico,
} from '../src/lib/formato.ts';
import { restanteDe, contaComoReceita, ehStatus, STATUS_VALIDOS } from '../src/lib/tipos.ts';

describe('semana comercial vai de segunda a domingo', () => {
  // Regra 3: nada de startOfWeek padrão do date-fns, que começa no domingo.
  const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  test('a semana começa na segunda, qualquer que seja o dia de referência', () => {
    // 17/08/2026 é uma segunda-feira
    for (let i = 0; i < 7; i++) {
      const referencia = new Date(2026, 7, 17 + i, 12);
      const inicio = inicioSemana(referencia);
      assert.equal(
        inicio.getDay(),
        1,
        `${dias[referencia.getDay()]} caiu numa semana que começa em ${dias[inicio.getDay()]}`
      );
      assert.equal(isoDia(inicio), '2026-08-17');
    }
  });

  test('a semana termina no domingo', () => {
    const fim = fimSemana(new Date(2026, 7, 20, 12));
    assert.equal(fim.getDay(), 0);
    assert.equal(isoDia(fim), '2026-08-23');
  });

  test('domingo pertence à semana que começou na segunda anterior', () => {
    // O erro clássico: domingo virar início de uma semana nova e o caixa
    // do domingo cair na semana seguinte.
    const domingo = new Date(2026, 7, 23, 12);
    assert.equal(isoDia(inicioSemana(domingo)), '2026-08-17');
  });
});

describe('data de retirada é dia puro, sem pulo de fuso', () => {
  // Regra 4: nunca new Date(iso) nem toISOString().slice(0,10).
  test('dataLocal devolve o mesmo dia que está escrito', () => {
    for (const iso of ['2026-01-01', '2026-03-15', '2026-08-20', '2026-12-31']) {
      const d = dataLocal(iso);
      assert.ok(d, `${iso} não virou data`);
      assert.equal(isoDia(d), iso, `${iso} mudou de dia na conversão`);
    }
  });

  test('ida e volta não perde o dia em nenhum dia do ano', () => {
    const inicio = new Date(2026, 0, 1, 12);
    for (let i = 0; i < 365; i++) {
      const d = new Date(inicio.getTime());
      d.setDate(inicio.getDate() + i);
      const iso = isoDia(d);
      assert.equal(isoDia(dataLocal(iso)!), iso);
    }
  });

  test('new Date(iso) erraria o dia — é por isso que dataLocal existe', () => {
    // Documenta o motivo da regra: em fuso negativo, o parse UTC volta um dia.
    const iso = '2026-08-20';
    const fusoNegativo = new Date(iso).getTimezoneOffset() > 0;
    if (fusoNegativo) {
      assert.notEqual(isoDia(new Date(iso)), iso);
    }
    assert.equal(isoDia(dataLocal(iso)!), iso);
  });

  test('data vazia não quebra', () => {
    assert.equal(dataLocal(null), null);
    assert.equal(dataLocal(''), null);
    assert.equal(dataLocal('nada disso'), null);
    assert.equal(diasAte(null), null);
  });
});

describe('dinheiro é centavo inteiro, formatado só na tela', () => {
  // Regra 5.
  test('moeda formata em real brasileiro', () => {
    assert.match(moeda(7000), /70,00/);
    assert.match(moeda(0), /0,00/);
    assert.match(moeda(123456), /1\.234,56/);
  });

  test('valor negativo aparece com sinal', () => {
    assert.match(moeda(-3150), /-|−/);
  });
});

describe('sinal nunca passa do valor a cobrar', () => {
  // Regra 6: o restante é o que ela paga na retirada, e não pode ser negativo.
  test('o que falta é valor menos sinal', () => {
    assert.equal(restanteDe({ valor_centavos: 12000, sinal_centavos: 5000 }), 7000);
  });

  test('sem sinal, falta o valor inteiro', () => {
    assert.equal(restanteDe({ valor_centavos: 7000, sinal_centavos: 0 }), 7000);
  });

  test('sinal igual ao valor zera o que falta', () => {
    assert.equal(restanteDe({ valor_centavos: 7000, sinal_centavos: 7000 }), 0);
  });

  test('sinal maior que o valor não vira dívida do ateliê', () => {
    assert.equal(restanteDe({ valor_centavos: 5000, sinal_centavos: 9000 }), 0);
  });
});

describe('só pedido entregue conta como receita', () => {
  // Regra 2. A conta estava escrita solta em duas telas; agora é uma função só.
  test('entregue com data de entrega conta', () => {
    assert.equal(contaComoReceita({ status: 'entregue', entregue_em: '2026-08-20T10:00:00Z' }), true);
  });

  test('entregue sem data de entrega não conta', () => {
    // meio-caminho: o estado mudou mas o registro não fechou
    assert.equal(contaComoReceita({ status: 'entregue', entregue_em: null }), false);
  });

  test('nenhum outro estado conta, nem com data preenchida', () => {
    for (const status of ['novo', 'agendado', 'pronto', 'cancelado'] as const) {
      assert.equal(
        contaComoReceita({ status, entregue_em: '2026-08-20T10:00:00Z' }),
        false,
        `${status} entrou no faturamento`
      );
    }
  });
});

describe('estado do pedido é lista fechada', () => {
  test('os cinco valem', () => {
    for (const s of STATUS_VALIDOS) assert.equal(ehStatus(s), true);
  });

  test('qualquer outra coisa não vale', () => {
    for (const lixo of ['ENTREGUE', 'finalizado', '', ' novo', null, 7, {}]) {
      assert.equal(ehStatus(lixo), false, `${JSON.stringify(lixo)} passou`);
    }
  });
});

describe('peça atrasada é dita como atrasada', () => {
  // A tela escrevia "em -7 dias". Este cartaz é o único lugar onde uma peça
  // que passou do dia aparece: a fita métrica só mostra de hoje em diante.
  test('o prazo de hoje e de amanhã tem nome próprio', () => {
    assert.equal(prazoEmPalavras(0), 'hoje');
    assert.equal(prazoEmPalavras(1), 'amanhã');
  });

  test('dias à frente contam para frente', () => {
    assert.equal(prazoEmPalavras(3), 'em 3 dias');
  });

  test('nenhum prazo sai com número negativo', () => {
    for (let d = -60; d <= 60; d++) {
      const texto = prazoEmPalavras(d);
      assert.doesNotMatch(texto, /-\d/, `saiu número negativo em ${d}: "${texto}"`);
    }
  });

  test('o atraso é dito com todas as letras', () => {
    assert.equal(prazoEmPalavras(-1), 'era ontem');
    assert.equal(prazoEmPalavras(-7), 'atrasada 7 dias');
  });
});

describe('o prazo de um serviço da tabela', () => {
  test('em horas, para o que sai enquanto a cliente espera', () => {
    assert.equal(prazoDoServico(2, 'horas'), '2 horas');
    assert.equal(prazoDoServico(1, 'horas'), '1 hora');
  });

  test('em dias, como sempre foi', () => {
    assert.equal(prazoDoServico(7, 'dias'), '7 dias');
    assert.equal(prazoDoServico(1, 'dias'), '1 dia');
  });

  /** Prazo zero ou negativo não existe: sairia "fica pronto em 0 dias". */
  test('nunca escreve prazo de zero ou menos', () => {
    for (const n of [0, -3, NaN]) {
      assert.equal(prazoDoServico(n, 'dias'), '1 dia', String(n));
      assert.equal(prazoDoServico(n, 'horas'), '1 hora', String(n));
    }
  });

  test('número quebrado é arredondado, não escrito com vírgula', () => {
    assert.equal(prazoDoServico(2.4, 'horas'), '2 horas');
    assert.equal(prazoDoServico(2.6, 'horas'), '3 horas');
  });
});
