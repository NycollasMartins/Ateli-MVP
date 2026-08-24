import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { contar, resumoDaSaude, type Checagem } from '../src/lib/saude.ts';

const c = (situacao: Checagem['situacao']): Checagem => ({ item: 'x', situacao, recado: '' });

describe('o resumo mostra o pior estado, não a média', () => {
  // esconder um "falta" no meio de dez "ok" faria a tela dizer que está tudo
  // bem enquanto o ateliê não funciona
  test('uma falta vence tudo', () => {
    assert.equal(resumoDaSaude([c('ok'), c('ok'), c('atencao'), c('falta'), c('ok')]), 'falta');
  });

  test('atenção vence ok', () => {
    assert.equal(resumoDaSaude([c('ok'), c('atencao'), c('ok')]), 'atencao');
  });

  test('só ok é ok', () => {
    assert.equal(resumoDaSaude([c('ok'), c('ok')]), 'ok');
  });

  test('lista vazia não inventa problema', () => {
    assert.equal(resumoDaSaude([]), 'ok');
  });

  test('a ordem da lista não muda o resumo', () => {
    const itens = [c('ok'), c('falta'), c('atencao')];
    for (let i = 0; i < 10; i++) {
      assert.equal(resumoDaSaude([...itens].sort(() => (i % 2 ? 1 : -1))), 'falta');
    }
  });
});

describe('a contagem por estado', () => {
  test('conta certo', () => {
    const itens = [c('falta'), c('falta'), c('atencao'), c('ok')];
    assert.equal(contar(itens, 'falta'), 2);
    assert.equal(contar(itens, 'atencao'), 1);
    assert.equal(contar(itens, 'ok'), 1);
  });
});
