import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { passouDoLimite, ipsGuardados } from '../src/lib/limite.ts';

const espere = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('o freio das rotas abertas', () => {
  test('deixa passar até o teto e barra do teto em diante', () => {
    const chave = 'teste-teto';
    for (let i = 0; i < 3; i++) {
      assert.equal(passouDoLimite(chave, '1.1.1.1', 3), false, `barrou no envio ${i + 1}`);
    }
    assert.equal(passouDoLimite(chave, '1.1.1.1', 3), true, 'não barrou o quarto envio');
  });

  test('um IP não gasta a cota do outro', () => {
    const chave = 'teste-vizinho';
    for (let i = 0; i < 4; i++) passouDoLimite(chave, '2.2.2.2', 3);
    assert.equal(passouDoLimite(chave, '3.3.3.3', 3), false, 'o vizinho pagou pelo barulhento');
  });

  test('passada a janela, o IP volta a poder enviar', async () => {
    const chave = 'teste-janela';
    for (let i = 0; i < 4; i++) passouDoLimite(chave, '4.4.4.4', 3, 0.05);
    assert.equal(passouDoLimite(chave, '4.4.4.4', 3, 0.05), true);

    await espere(80);
    assert.equal(passouDoLimite(chave, '4.4.4.4', 3, 0.05), false, 'ficou barrado depois da janela');
  });

  test('quem não volta é esquecido, em vez de ficar guardado para sempre', async () => {
    const chave = 'teste-memoria';
    for (let i = 0; i < 50; i++) passouDoLimite(chave, `10.0.0.${i}`, 3, 0.05);
    assert.equal(ipsGuardados(chave), 50);

    await espere(80);

    // basta alguém bater na porta para os antigos saírem do mapa
    passouDoLimite(chave, '10.0.1.1', 3, 0.05);
    assert.equal(ipsGuardados(chave), 1, 'o mapa do freio cresce sem parar');
  });
});
