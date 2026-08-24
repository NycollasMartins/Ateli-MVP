import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ehEnderecoDeTeste } from '../src/lib/endereco.ts';

/**
 * O guarda anterior lia o texto do arquivo procurando a palavra "localhost" —
 * e passava porque a encontrava num comentário. Continuaria verde com a
 * detecção inteira removida. Aqui se testa o comportamento.
 */
describe('reconhece endereço que só funciona em quem instalou', () => {
  const deTeste = [
    'http://localhost:3000',
    'http://localhost',
    'https://LOCALHOST:3000',
    'localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.1.2.3',
    'http://0.0.0.0:8080',
    'http://[::1]:3000',
    'http://192.168.0.62:3000',
    'http://10.0.0.5',
    'http://172.16.3.4',
    'http://172.31.255.1',
    'http://macbook-da-rosa.local:3000',
  ];

  for (const e of deTeste) {
    test(`"${e}" não serve para o cartaz`, () => {
      assert.equal(ehEnderecoDeTeste(e), true);
    });
  }
});

describe('endereço de verdade passa', () => {
  const publicos = [
    'https://atelie-da-rosa.vercel.app',
    'https://ateliedarosa.com.br',
    'https://www.ateliedarosa.com.br',
    'http://200.150.10.1',
    // 172.32 já está fora da faixa privada
    'http://172.32.0.1',
    'http://11.0.0.1',
  ];

  for (const e of publicos) {
    test(`"${e}" serve`, () => {
      assert.equal(ehEnderecoDeTeste(e), false);
    });
  }

  test('endereço vazio ou sem sentido não vira alarme falso', () => {
    for (const e of ['', '   ', 'nada disso']) {
      assert.equal(ehEnderecoDeTeste(e), false, `"${e}" gerou aviso à toa`);
    }
  });
});
