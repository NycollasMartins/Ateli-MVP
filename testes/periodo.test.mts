import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  periodoDe,
  recuar,
  avancar,
  noPresente,
  diasDoPeriodo,
  encaixaNoAnterior,
} from '../src/lib/periodo.ts';
import { isoDia } from '../src/lib/formato.ts';

const em = (a: number, m: number, d: number) => new Date(a, m - 1, d, 12);

describe('o período mostrado responde ao recuo', () => {
  test('recuo zero é agora', () => {
    const p = periodoDe(em(2026, 8, 20), 'semana', 0);
    assert.equal(isoDia(p.ini), '2026-08-17');
    assert.equal(isoDia(p.fim), '2026-08-23');
  });

  test('cada passo volta uma semana inteira', () => {
    for (let r = 0; r <= 10; r++) {
      const p = periodoDe(em(2026, 8, 20), 'semana', r);
      assert.equal(diasDoPeriodo(p), 7, `recuo ${r} não deu uma semana`);
    }
  });

  test('o mês recuado é o mês inteiro, não trinta dias para trás', () => {
    const p = periodoDe(em(2026, 3, 31), 'mes', 1);
    assert.equal(isoDia(p.ini), '2026-02-01');
    assert.equal(isoDia(p.fim), '2026-02-28');
  });

  test('recuar do dia 31 não pula fevereiro', () => {
    // subtrair mês a partir do dia 31 costuma escorregar; aqui não pode
    const meses = [1, 2, 3].map((r) => isoDia(periodoDe(em(2026, 3, 31), 'mes', r).ini));
    assert.deepEqual(meses, ['2026-02-01', '2026-01-01', '2025-12-01']);
  });

  test('atravessa a virada do ano', () => {
    const p = periodoDe(em(2027, 1, 10), 'mes', 1);
    assert.equal(isoDia(p.ini), '2026-12-01');
    assert.equal(isoDia(p.fim), '2026-12-31');
  });

  test('recuo negativo é tratado como agora', () => {
    const agora = periodoDe(em(2026, 8, 20), 'semana', 0);
    for (const r of [-1, -50]) {
      assert.equal(isoDia(periodoDe(em(2026, 8, 20), 'semana', r).ini), isoDia(agora.ini));
    }
  });
});

describe('a comparação olha o período anterior ao escolhido', () => {
  test('em julho, compara com junho — não com o mês corrente', () => {
    // o erro fácil: comparar sempre com "o mês passado" a partir de hoje
    const p = periodoDe(em(2026, 8, 20), 'mes', 1);
    assert.equal(isoDia(p.ini), '2026-07-01');
    assert.equal(isoDia(p.anteriorIni), '2026-06-01');
    assert.equal(isoDia(p.anteriorFim), '2026-06-30');
  });

  test('o anterior de um recuo é o período do recuo seguinte', () => {
    for (const tipo of ['semana', 'mes'] as const) {
      for (let r = 0; r <= 12; r++) {
        const p = periodoDe(em(2026, 8, 20), tipo, r);
        const seguinte = periodoDe(em(2026, 8, 20), tipo, r + 1);
        assert.equal(isoDia(p.anteriorIni), isoDia(seguinte.ini), `${tipo} r${r}`);
        assert.equal(isoDia(p.anteriorFim), isoDia(seguinte.fim), `${tipo} r${r}`);
      }
    }
  });
});

describe('não há buraco nem sobreposição entre períodos', () => {
  test('varredura de dois anos, nas duas visões, com 25 recuos', () => {
    let combinacoes = 0;

    for (const ano of [2026, 2027]) {
      for (let mes = 1; mes <= 12; mes++) {
        const ultimo = new Date(ano, mes, 0).getDate();
        for (const dia of [1, 15, ultimo]) {
          const hoje = em(ano, mes, dia);
          for (const tipo of ['semana', 'mes'] as const) {
            for (let recuo = 0; recuo <= 24; recuo++) {
              const p = periodoDe(hoje, tipo, recuo);
              combinacoes++;

              assert.ok(p.ini <= p.fim, `${isoDia(hoje)} ${tipo} r${recuo}: início depois do fim`);
              assert.ok(
                p.anteriorFim < p.ini,
                `${isoDia(hoje)} ${tipo} r${recuo}: o anterior invade o período`
              );
              assert.ok(
                encaixaNoAnterior(p),
                `${isoDia(hoje)} ${tipo} r${recuo}: buraco entre os períodos`
              );
              if (tipo === 'semana') {
                assert.equal(diasDoPeriodo(p), 7, `${isoDia(hoje)} r${recuo}`);
              } else {
                assert.equal(p.ini.getDate(), 1, `${isoDia(hoje)} r${recuo}: mês não começa no dia 1`);
                assert.ok(p.fim.getDate() >= 28, `${isoDia(hoje)} r${recuo}: mês curto demais`);
              }
            }
          }
        }
      }
    }

    assert.equal(combinacoes, 3600);
  });
});

describe('os botões de navegar não escapam do presente', () => {
  test('avançar nunca passa de agora', () => {
    for (let r = 0; r <= 5; r++) assert.ok(avancar(r) >= 0, `avancar(${r}) ficou negativo`);
    assert.equal(avancar(0), 0);
    assert.equal(avancar(3), 2);
  });

  test('recuar sempre anda para trás', () => {
    assert.equal(recuar(0), 1);
    assert.equal(recuar(9), 10);
  });

  test('só está no presente quem não recuou', () => {
    assert.equal(noPresente(0), true);
    assert.equal(noPresente(1), false);
  });
});
