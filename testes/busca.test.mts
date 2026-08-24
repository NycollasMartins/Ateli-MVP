import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { casaComBusca } from '../src/lib/busca.ts';

const acha = (termo: string, nome: string, tel = '') =>
  casaComBusca(termo, [nome], [tel]);

describe('acento não pode atrapalhar a busca', () => {
  // Ninguém digita acento numa busca rápida, e no celular dá ainda mais trabalho
  const nomes = [
    ['Maria da Conceição', 'conceicao'],
    ['José Antônio', 'jose'],
    ['Antônio', 'antonio'],
    ['Inês', 'ines'],
    ['Vitória', 'vitoria'],
    ['Küster', 'kuster'],
    ['Gonçalves', 'goncalves'],
    ['Ângela', 'angela'],
    ['Luís Inácio', 'luis inacio'],
  ];

  for (const [nome, digitado] of nomes) {
    test(`"${digitado}" acha "${nome}"`, () => {
      assert.equal(acha(digitado, nome), true);
    });
  }

  test('com acento também acha, claro', () => {
    assert.equal(acha('conceição', 'Maria da Conceição'), true);
  });

  test('maiúscula e minúscula tanto faz', () => {
    for (const t of ['CONCEIÇÃO', 'Conceicao', 'cOnCeIcAo']) {
      assert.equal(acha(t, 'Maria da Conceição'), true, t);
    }
  });

  test('nome diferente continua não aparecendo', () => {
    assert.equal(acha('joana', 'Maria da Conceição'), false);
  });
});

describe('telefone acha em qualquer formato', () => {
  const guardado = '(11) 98765-4321';

  for (const digitado of ['11987654321', '(11) 98765-4321', '98765', '11 98765 4321', '987654321']) {
    test(`"${digitado}" acha o número guardado`, () => {
      assert.equal(acha(digitado, 'Ana', guardado), true);
    });
  }

  test('número de outra pessoa não aparece', () => {
    assert.equal(acha('21999990000', 'Ana', guardado), false);
  });

  test('poucos dígitos não trazem meio ateliê', () => {
    // digitar "2" traria todo telefone que contém 2
    assert.equal(acha('2', 'Ana', guardado), false);
    assert.equal(acha('21', 'Ana', guardado), false);
  });
});

describe('o resto do comportamento', () => {
  test('busca vazia mostra tudo', () => {
    for (const t of ['', '   ']) assert.equal(acha(t, 'Ana'), true, JSON.stringify(t));
  });

  test('procura em todos os campos que recebe', () => {
    assert.equal(casaComBusca('calça', ['Ana', 'AT-9K2P', 'Calça'], []), true);
    assert.equal(casaComBusca('9k2p', ['Ana', 'AT-9K2P', 'Calça'], []), true);
    assert.equal(casaComBusca('at-9k2p', ['Ana', 'AT-9K2P', 'Calça'], []), true);
  });

  test('campo vazio ou nulo não quebra', () => {
    assert.equal(casaComBusca('ana', [null, undefined, 'Ana'], [null]), true);
    assert.equal(casaComBusca('zzz', [null, undefined], [null]), false);
  });
});
