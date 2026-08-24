import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pendenciasDeAviso, avisoSugerido } from '../src/lib/avisos.ts';
import { CHAVE_AVISO, textoParaCliente, type TipoAviso } from '../src/lib/mensagens.ts';
import { isoDia } from '../src/lib/formato.ts';
import type { Pedido, Status } from '../src/lib/tipos.ts';

const emDias = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return isoDia(d);
};

function pedido(p: Partial<Pedido> & { id: string }): Pedido {
  return {
    codigo: 'AT-' + p.id, cliente_nome: 'Ana Souza', cliente_telefone: '11987654321',
    cliente_email: null, cliente_ramal: null, peca: 'Calça', descricao: null, observacoes: null, urgente: false, urgente_perfil: null, acrescimo_centavos: 0,
    status: 'agendado' as Status, retirada_em: emDias(3), retirada_hora: '10:00',
    valor_centavos: 7000, sinal_centavos: 0, pago: false, pago_em: null, forma_pagamento: null,
    entregue_em: null, google_event_id: null, criado_em: '2026-01-01T10:00:00Z',
    atualizado_em: '2026-01-01T10:00:00Z', ...p,
  };
}

const avisado = (...tipos: TipoAviso[]) => tipos.map((t) => ({ tipo: CHAVE_AVISO[t] }));
const tipos = (ps: Pedido[]) => pendenciasDeAviso(ps).map((x) => x.tipo);

describe('peça que passou do dia não some da lista', () => {
  // Era o buraco: a regra exigia dias >= 0 para sugerir a mensagem da data.
  // Retirada na sexta, WhatsApp não mandado, sexta passa — e o painel parava
  // de cobrar, em silêncio, no caso mais urgente.
  test('atrasada e nunca avisada aparece', () => {
    assert.deepEqual(tipos([pedido({ id: '1', retirada_em: emDias(-3) })]), ['atrasada']);
  });

  test('atrasada aparece mesmo se a data já tinha sido avisada', () => {
    const p = pedido({ id: '1', retirada_em: emDias(-5), notificacoes: avisado('marcada') });
    assert.deepEqual(tipos([p]), ['atrasada']);
  });

  test('não cobra duas vezes o mesmo atraso', () => {
    const p = pedido({ id: '1', retirada_em: emDias(-5), notificacoes: avisado('marcada', 'atrasada') });
    assert.deepEqual(tipos([p]), []);
  });

  test('peça pronta que ninguém veio buscar também é cobrada', () => {
    const p = pedido({
      id: '1', status: 'pronto', retirada_em: emDias(-4), notificacoes: avisado('pronta'),
    });
    assert.deepEqual(tipos([p]), ['atrasada']);
  });

  test('qualquer atraso, de 1 a 90 dias, continua na lista', () => {
    for (let d = 1; d <= 90; d++) {
      const p = pedido({ id: 'x', retirada_em: emDias(-d) });
      assert.deepEqual(tipos([p]), ['atrasada'], `${d} dias de atraso sumiu`);
    }
  });
});

describe('a notícia mais recente vence a mais antiga', () => {
  test('quem soube que a peça ficou pronta não é cobrado sobre a data', () => {
    const p = pedido({ id: '1', status: 'pronto', notificacoes: avisado('pronta') });
    assert.deepEqual(tipos([p]), []);
  });

  test('peça pronta e não avisada pede o aviso de pronta', () => {
    assert.deepEqual(tipos([pedido({ id: '1', status: 'pronto' })]), ['pronta']);
  });
});

describe('o dia a dia continua funcionando', () => {
  test('véspera pede lembrete', () => {
    const p = pedido({ id: '1', retirada_em: emDias(1), notificacoes: avisado('marcada') });
    assert.deepEqual(tipos([p]), ['vespera']);
  });

  test('data marcada e não avisada pede a data', () => {
    assert.deepEqual(tipos([pedido({ id: '1', retirada_em: emDias(4) })]), ['marcada']);
  });

  test('tudo avisado não pede nada', () => {
    const p = pedido({ id: '1', retirada_em: emDias(1), notificacoes: avisado('marcada', 'vespera') });
    assert.deepEqual(tipos([p]), []);
  });

  test('entregue e cancelado ficam de fora', () => {
    const ps = [
      pedido({ id: '1', status: 'entregue', retirada_em: emDias(-2) }),
      pedido({ id: '2', status: 'cancelado', retirada_em: emDias(-2) }),
      pedido({ id: '3', status: 'novo', retirada_em: null }),
    ];
    assert.deepEqual(tipos(ps), []);
  });

  test('quem espera há mais tempo vem primeiro', () => {
    const ps = [
      pedido({ id: 'a', retirada_em: emDias(2) }),
      pedido({ id: 'b', retirada_em: emDias(-9) }),
      pedido({ id: 'c', retirada_em: emDias(-2) }),
    ];
    assert.deepEqual(pendenciasDeAviso(ps).map((x) => x.pedido.id), ['b', 'c', 'a']);
  });
});

describe('a mensagem de atraso não fala como se o dia não tivesse chegado', () => {
  test('não promete futuro', () => {
    const p = pedido({ id: '1', peca: 'Vestido', retirada_em: emDias(-4) });
    const texto = textoParaCliente(p, 'atrasada', 'Ateliê da Rosa');
    assert.doesNotMatch(texto, /fica pronto|fica pronta|amanhã/, texto);
    assert.match(texto, /esperando você/);
  });

  test('concorda em gênero, como as outras', () => {
    const masc = textoParaCliente(pedido({ id: '1', peca: 'Vestido', retirada_em: emDias(-2) }), 'atrasada', 'X');
    const fem = textoParaCliente(pedido({ id: '2', peca: 'Calça', retirada_em: emDias(-2) }), 'atrasada', 'X');
    assert.match(masc, /está pronto/);
    assert.match(fem, /está pronta/);
  });
});

describe('a sugestão é a mesma no cartaz e dentro do pedido', () => {
  // Era o defeito: a lista aprendeu a tratar peça atrasada e o painel do
  // pedido não. Abrir uma peça que passou do dia oferecia a mensagem da data,
  // prometendo à cliente um dia que já tinha passado.
  test('peça atrasada sugere chamar para buscar, não mandar a data', () => {
    const p = pedido({ id: '1', retirada_em: emDias(-5) });
    assert.equal(avisoSugerido(p)!.tipo, 'atrasada');
  });

  test('o painel e o cartaz concordam em todo estado', () => {
    const casos: [string, Partial<Pedido>][] = [
      ['atrasada', { retirada_em: emDias(-1) }],
      ['atrasada', { retirada_em: emDias(-30) }],
      ['vespera', { retirada_em: emDias(1) }],
      ['marcada', { retirada_em: emDias(5) }],
      ['pronta', { status: 'pronto' as Status, retirada_em: emDias(2) }],
      ['atrasada', { status: 'pronto' as Status, retirada_em: emDias(-2) }],
    ];

    for (const [esperado, campos] of casos) {
      const p = pedido({ id: 'x', ...campos });
      // o painel usa avisoSugerido direto; o cartaz usa a mesma função por baixo
      assert.equal(avisoSugerido(p)!.tipo, esperado, JSON.stringify(campos));
      assert.deepEqual(tipos([p]), [esperado], `o cartaz discordou em ${JSON.stringify(campos)}`);
    }
  });

  test('pedido sem data ou já encerrado não sugere nada', () => {
    for (const campos of [
      { retirada_em: null },
      { status: 'entregue' as Status },
      { status: 'cancelado' as Status },
      { status: 'novo' as Status, retirada_em: null },
    ]) {
      assert.equal(avisoSugerido(pedido({ id: 'x', ...campos })), null, JSON.stringify(campos));
    }
  });

  test('a sugestão existe mesmo depois de tudo avisado', () => {
    // o botão do painel precisa de um tipo para o "avisar de novo"
    const p = pedido({ id: '1', retirada_em: emDias(5), notificacoes: avisado('marcada') });
    assert.equal(avisoSugerido(p)!.tipo, 'marcada');
    assert.deepEqual(tipos([p]), [], 'o cartaz não devia cobrar de novo');
  });
});
