import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  acrescimoDaPressa,
  isentoDeAcrescimo,
  ehUrgentePerfil,
  ACRESCIMO_PRESSA_CENTAVOS,
} from '../src/lib/tipos.ts';

describe('o preço da pressa', () => {
  test('sem pressa, não custa nada — mesmo com perfil junto', () => {
    assert.equal(acrescimoDaPressa(false, null), 0);
    assert.equal(acrescimoDaPressa(false, 'outro'), 0);
    assert.equal(acrescimoDaPressa(false, 'ministro'), 0);
  });

  test('ministro e advogado têm a pressa sem pagar por ela', () => {
    assert.equal(acrescimoDaPressa(true, 'ministro'), 0);
    assert.equal(acrescimoDaPressa(true, 'advogado'), 0);
  });

  test('o resto paga o acréscimo', () => {
    assert.equal(acrescimoDaPressa(true, 'outro'), ACRESCIMO_PRESSA_CENTAVOS);
  });

  /**
   * Quem marca a pressa e some sem responder não pode sair de graça: seria a
   * forma mais fácil de furar a fila, e bastaria fechar a janela da pergunta.
   */
  test('pressa sem resposta cobra, em vez de isentar', () => {
    assert.equal(acrescimoDaPressa(true, null), ACRESCIMO_PRESSA_CENTAVOS);
    assert.equal(acrescimoDaPressa(true, undefined), ACRESCIMO_PRESSA_CENTAVOS);
  });

  test('o acréscimo é de dez reais, em centavos', () => {
    assert.equal(ACRESCIMO_PRESSA_CENTAVOS, 1000);
  });

  test('quem é isento', () => {
    assert.equal(isentoDeAcrescimo('ministro'), true);
    assert.equal(isentoDeAcrescimo('advogado'), true);
    assert.equal(isentoDeAcrescimo('outro'), false);
    assert.equal(isentoDeAcrescimo(null), false);
  });

  test('perfil inventado não vira isenção', () => {
    for (const lixo of ['juiz', 'MINISTRO', '', null, 7, {}]) {
      assert.equal(ehUrgentePerfil(lixo), false, JSON.stringify(lixo));
    }
    assert.equal(ehUrgentePerfil('ministro'), true);
  });
});
