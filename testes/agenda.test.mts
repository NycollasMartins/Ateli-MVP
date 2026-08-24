import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { janelaDoEvento } from '../src/lib/google';

/** O Google recusa a data inteira se a hora não existir no relógio (T24:15:00). */
const HORA_VALIDA = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:00$/;

describe('a janela do evento de retirada', () => {
  test('meia hora depois, no mesmo dia', () => {
    assert.deepEqual(janelaDoEvento('2026-08-24', '10:00'), {
      inicio: '2026-08-24T10:00:00',
      fim: '2026-08-24T10:30:00',
    });
  });

  test('passando de meia hora, a hora avança', () => {
    assert.equal(janelaDoEvento('2026-08-24', '10:45').fim, '2026-08-24T11:15:00');
  });

  test('sem hora marcada, o padrão é 10:00', () => {
    assert.deepEqual(janelaDoEvento('2026-08-24', null), {
      inicio: '2026-08-24T10:00:00',
      fim: '2026-08-24T10:30:00',
    });
  });

  test('retirada perto da meia-noite termina no dia seguinte', () => {
    assert.deepEqual(janelaDoEvento('2026-08-24', '23:45'), {
      inicio: '2026-08-24T23:45:00',
      fim: '2026-08-25T00:15:00',
    });
  });

  test('a virada do mês também vira o mês', () => {
    assert.equal(janelaDoEvento('2026-08-31', '23:50').fim, '2026-09-01T00:20:00');
  });

  test('e a virada do ano, o ano', () => {
    assert.equal(janelaDoEvento('2026-12-31', '23:59').fim, '2027-01-01T00:29:00');
  });

  test('varredura: nenhum minuto do dia gera hora que não existe', () => {
    for (let minuto = 0; minuto < 24 * 60; minuto++) {
      const hora = `${String(Math.floor(minuto / 60)).padStart(2, '0')}:${String(minuto % 60).padStart(2, '0')}`;
      const { inicio, fim } = janelaDoEvento('2026-08-24', hora);
      assert.match(inicio, HORA_VALIDA, `início inválido para ${hora}: ${inicio}`);
      assert.match(fim, HORA_VALIDA, `fim inválido para ${hora}: ${fim}`);
      assert.ok(fim > inicio, `fim não vem depois do início para ${hora}`);
    }
  });
});
