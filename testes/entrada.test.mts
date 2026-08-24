import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITE, texto, ramal } from '../src/lib/entrada.ts';
import { PECAS } from '../src/lib/tipos.ts';

describe('o que chega pela rota aberta tem teto', () => {
  test('nome enorme é cortado no limite', () => {
    assert.equal(texto('A'.repeat(100_000), LIMITE.nome).length, LIMITE.nome);
  });

  test('cada campo respeita o seu teto', () => {
    for (const [campo, maximo] of Object.entries(LIMITE)) {
      assert.equal(texto('x'.repeat(maximo + 5_000), maximo).length, maximo, `${campo} passou`);
    }
  });

  test('nome de gente de verdade passa inteiro', () => {
    const nome = 'Maria da Conceição Fernandes de Albuquerque Santos';
    assert.equal(texto(nome, LIMITE.nome), nome);
    assert.ok(nome.length < LIMITE.nome, 'o limite ficou apertado demais para nome real');
  });

  test('espaço nas pontas some', () => {
    assert.equal(texto('  Ana Souza  ', LIMITE.nome), 'Ana Souza');
  });

  test('nulo e lixo viram texto vazio, não "null"', () => {
    for (const v of [null, undefined, '']) assert.equal(texto(v, 10), '');
  });

  test('ramal de verdade cabe', () => {
    // ramal aqui tem 4 dígitos; 10 cobre com folga quem escreve com o prefixo
    assert.ok(LIMITE.ramal >= 4);
  });
});

describe('a peça vem de uma lista fechada', () => {
  test('todas as opções do formulário cabem no limite', () => {
    for (const p of PECAS) {
      assert.ok(p.length <= LIMITE.peca, `"${p}" não cabe em ${LIMITE.peca}`);
      assert.equal(texto(p, LIMITE.peca), p);
    }
  });

  test('a lista não tem opção vazia, que passaria pela validação', () => {
    for (const p of PECAS) assert.ok(p.trim().length > 0);
  });
});

describe('o ramal de quem deixou a peça', () => {
  test('guarda só os números', () => {
    assert.equal(ramal('4231'), '4231');
    assert.equal(ramal(' 42-31 '), '4231');
    assert.equal(ramal('ramal 4231'), '4231');
  });

  test('o que não tem número nenhum vira vazio, e o pedido segue', () => {
    for (const lixo of ['', '   ', 'não sei', '----']) {
      assert.equal(ramal(lixo), '', `passou: ${JSON.stringify(lixo)}`);
    }
  });

  test('nulo, número e objeto não estouram', () => {
    assert.equal(ramal(null), '');
    assert.equal(ramal(undefined), '');
    assert.equal(ramal(4231), '4231');
    assert.equal(ramal({}), '');
  });

  test('respeita o teto de tamanho', () => {
    assert.equal(ramal('9'.repeat(50)).length, LIMITE.ramal);
  });
});
