import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularTamanho,
  comExtensao,
  valeEncolher,
  LADO_MAXIMO,
  JA_PEQUENA,
} from '../src/lib/imagem.ts';

describe('o tamanho de destino mantém a proporção', () => {
  test('foto deitada de celular cabe no lado maior', () => {
    const r = calcularTamanho(4032, 3024);
    assert.equal(r.largura, LADO_MAXIMO);
    assert.equal(r.altura, 1200);
  });

  test('foto em pé também', () => {
    const r = calcularTamanho(3024, 4032);
    assert.equal(r.altura, LADO_MAXIMO);
    assert.equal(r.largura, 1200);
  });

  test('nunca aumenta imagem pequena', () => {
    assert.deepEqual(calcularTamanho(800, 600), { largura: 800, altura: 600 });
    assert.deepEqual(calcularTamanho(LADO_MAXIMO, 900), { largura: LADO_MAXIMO, altura: 900 });
  });

  test('a proporção sobrevive em qualquer formato', () => {
    for (const [l, a] of [[4032, 3024], [3024, 4032], [6000, 4000], [1920, 1080], [2000, 2000]]) {
      const r = calcularTamanho(l, a);
      const antes = l / a;
      const depois = r.largura / r.altura;
      assert.ok(Math.abs(antes - depois) < 0.01, `${l}x${a} virou ${r.largura}x${r.altura}`);
      assert.ok(Math.max(r.largura, r.altura) <= LADO_MAXIMO, `${l}x${a} passou do máximo`);
    }
  });

  test('panorâmica extrema não vira zero pixel', () => {
    const r = calcularTamanho(10000, 3);
    assert.ok(r.altura >= 1, 'a altura sumiu');
    assert.equal(r.largura, LADO_MAXIMO);
  });

  test('imagem sem tamanho não quebra', () => {
    assert.deepEqual(calcularTamanho(0, 0), { largura: 0, altura: 0 });
  });
});

describe('só encolhe o que vale a pena', () => {
  test('foto grande de celular vale', () => {
    assert.equal(valeEncolher({ type: 'image/jpeg', size: 4_000_000 }), true);
  });

  test('imagem já pequena não é reprocessada', () => {
    assert.equal(valeEncolher({ type: 'image/jpeg', size: JA_PEQUENA - 1 }), false);
  });

  test('formato que o navegador não redesenha fica intacto', () => {
    for (const type of ['image/svg+xml', 'image/heic', 'application/pdf']) {
      assert.equal(valeEncolher({ type, size: 9_000_000 }), false, type);
    }
  });
});

describe('o nome do arquivo', () => {
  test('troca só a extensão', () => {
    assert.equal(comExtensao('IMG_1234.HEIC', 'jpg'), 'IMG_1234.jpg');
    assert.equal(comExtensao('foto da calça.png', 'jpg'), 'foto da calça.jpg');
  });

  test('nome sem extensão ganha uma', () => {
    assert.equal(comExtensao('foto', 'jpg'), 'foto.jpg');
  });

  test('ponto no meio do nome não confunde', () => {
    assert.equal(comExtensao('calça.azul.v2.png', 'jpg'), 'calça.azul.v2.jpg');
  });
});
