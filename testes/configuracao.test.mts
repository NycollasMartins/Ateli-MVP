import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const CHAVES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

/** O módulo lê process.env na chamada, então dá para reimportar sem cache. */
async function conferir() {
  const m = await import('../src/lib/configuracao.ts');
  return m.faltaConfigurar().map((v) => v.nome);
}

describe('o painel avisa o que falta configurar', () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const c of CHAVES) {
      original[c] = process.env[c];
      delete process.env[c];
    }
  });

  afterEach(() => {
    for (const c of CHAVES) {
      if (original[c] === undefined) delete process.env[c];
      else process.env[c] = original[c];
    }
  });

  test('sem nada preenchido, aponta as três', async () => {
    assert.deepEqual((await conferir()).sort(), [...CHAVES].sort());
  });

  test('aponta só a que falta', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'servico';
    assert.deepEqual(await conferir(), ['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
  });

  test('espaço em branco não conta como preenchido', async () => {
    for (const c of CHAVES) process.env[c] = '   ';
    assert.equal((await conferir()).length, 3);
  });

  test('com tudo preenchido, não sobra nada', async () => {
    for (const c of CHAVES) process.env[c] = 'valor';
    assert.deepEqual(await conferir(), []);
  });

  test('cada faltante diz onde achar a chave', async () => {
    const { faltaConfigurar } = await import('../src/lib/configuracao.ts');
    for (const v of faltaConfigurar()) {
      assert.match(v.onde, /Supabase/, `${v.nome} não diz onde procurar`);
    }
  });
});
