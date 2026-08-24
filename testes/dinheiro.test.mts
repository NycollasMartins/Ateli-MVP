import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { paraCentavos, paraReais } from '../src/lib/dinheiro.ts';

describe('lê dinheiro do jeito que a pessoa digitou', () => {
  // O defeito: apagar todos os pontos assumia a escrita brasileira, e quem
  // digitasse `70.00` recebia R$ 7.000,00 — cem vezes mais, em silêncio, no
  // campo que decide quanto a cliente paga.
  const casos: [string, number][] = [
    ['70', 7000],
    ['70,00', 7000],
    ['70.00', 7000],
    ['R$ 70,00', 7000],
    ['70,5', 7050],
    ['70.5', 7050],
    ['12.50', 1250],
    ['0,99', 99],
    ['0.99', 99],
    ['1.234,56', 123456],
    ['1,234.56', 123456],
    ['1.234', 123400],
    ['1.000', 100000],
    ['1.234.567', 123456700],
    ['', 0],
    ['abc', 0],
  ];

  for (const [digitado, esperado] of casos) {
    test(`"${digitado}" vale ${(esperado / 100).toFixed(2)}`, () => {
      assert.equal(paraCentavos(digitado), esperado);
    });
  }
});

describe('nenhum jeito de escrever multiplica o valor', () => {
  test('ponto e vírgula decimais dão o mesmo resultado', () => {
    // varredura: qualquer valor com centavos, escrito das duas formas
    for (let reais = 0; reais <= 300; reais++) {
      for (const centavos of ['00', '01', '50', '99']) {
        const comVirgula = paraCentavos(`${reais},${centavos}`);
        const comPonto = paraCentavos(`${reais}.${centavos}`);
        assert.equal(comPonto, comVirgula, `${reais},${centavos} vs ${reais}.${centavos}`);
        assert.equal(comVirgula, reais * 100 + Number(centavos));
      }
    }
  });

  test('uma casa decimal também bate', () => {
    for (let reais = 0; reais <= 200; reais++) {
      for (let d = 0; d <= 9; d++) {
        assert.equal(paraCentavos(`${reais}.${d}`), paraCentavos(`${reais},${d}`));
        assert.equal(paraCentavos(`${reais},${d}`), reais * 100 + d * 10);
      }
    }
  });

  test('ida e volta pelo campo não muda o valor', () => {
    for (let c = 0; c <= 500000; c += 137) {
      assert.equal(paraCentavos(paraReais(c)), c, `${c} centavos não sobreviveu`);
    }
  });
});

describe('separador de milhar não vira decimal', () => {
  test('três casas depois do ponto são milhares', () => {
    for (let milhares = 1; milhares <= 99; milhares++) {
      assert.equal(paraCentavos(`${milhares}.000`), milhares * 100000);
    }
  });
});
