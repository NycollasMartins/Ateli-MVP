import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITE, texto, email } from '../src/lib/entrada.ts';
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

  test('e-mail longo de verdade ainda cabe', () => {
    // o máximo de um e-mail pela norma é 254; 160 cobre o que existe na prática
    assert.ok(LIMITE.email >= 100);
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

describe('o e-mail da cliente', () => {
  test('endereço de verdade passa, em minúsculas', () => {
    assert.equal(email('Maria@Email.com'), 'maria@email.com');
    assert.equal(email('  ana.paula+atelie@gmail.com  '), 'ana.paula+atelie@gmail.com');
  });

  test('o que não é endereço vira vazio, e o pedido segue', () => {
    for (const lixo of ['', '   ', 'maria', 'maria@', '@email.com', 'maria email.com', 'maria@email', 'a@b c.com']) {
      assert.equal(email(lixo), '', `passou: ${JSON.stringify(lixo)}`);
    }
  });

  test('nulo, número e objeto não estouram', () => {
    for (const lixo of [null, undefined, 42, {}, []]) {
      assert.equal(email(lixo), '');
    }
  });

  test('continua respeitando o teto de tamanho', () => {
    assert.equal(email(`${'a'.repeat(LIMITE.email)}@email.com`), '');
  });
});
