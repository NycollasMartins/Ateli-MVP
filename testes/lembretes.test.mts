import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mudouARetirada } from '../src/lib/lembretes.ts';

const antes = { retirada_em: '2026-08-27', retirada_hora: '10:00' };

describe('avisos só caem quando a retirada muda de verdade', () => {
  test('mesma data e hora: não mexe nos avisos', () => {
    assert.equal(mudouARetirada(antes, { retirada_em: '2026-08-27', retirada_hora: '10:00' }), false);
  });

  test('salvar só a anotação não derruba o aviso já dado', () => {
    // era o incômodo: editar observações fazia o painel cobrar o WhatsApp de novo
    assert.equal(mudouARetirada(antes, { observacoes: 'medida nova' } as never), false);
  });

  test('dia diferente libera os avisos', () => {
    assert.equal(mudouARetirada(antes, { retirada_em: '2026-08-28', retirada_hora: '10:00' }), true);
  });

  test('hora diferente também', () => {
    assert.equal(mudouARetirada(antes, { retirada_em: '2026-08-27', retirada_hora: '14:30' }), true);
  });

  test('pedido sem data que ganha data conta como mudança', () => {
    assert.equal(
      mudouARetirada({ retirada_em: null, retirada_hora: '10:00' }, { retirada_em: '2026-08-27' }),
      true
    );
  });

  test('timestamp do banco compara igual à data pura', () => {
    // o Postgres pode devolver a coluna date com sufixo; comparar cru daria
    // "mudou" toda vez e a cliente seria avisada de novo sem motivo
    assert.equal(mudouARetirada({ retirada_em: '2026-08-27T00:00:00', retirada_hora: '10:00' },
      { retirada_em: '2026-08-27', retirada_hora: '10:00' }), false);
  });

  test('hora com segundos compara igual', () => {
    assert.equal(mudouARetirada({ retirada_em: '2026-08-27', retirada_hora: '10:00:00' },
      { retirada_em: '2026-08-27', retirada_hora: '10:00' }), false);
  });
});
