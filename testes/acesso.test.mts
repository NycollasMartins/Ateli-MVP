import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { papelDe, soAdminPode, SO_ADMIN, ehPapel } from '../src/lib/acesso.ts';

describe('o papel de quem está logado', () => {
  test('admin é admin', () => {
    assert.equal(papelDe({ app_metadata: { papel: 'admin' } }), 'admin');
  });

  test('sem papel escrito, é funcionário — nunca o contrário', () => {
    for (const usuario of [null, undefined, {}, { app_metadata: {} }, { app_metadata: { papel: '' } }]) {
      assert.equal(papelDe(usuario), 'funcionario', JSON.stringify(usuario));
    }
  });

  test('papel inventado não promove ninguém', () => {
    for (const inventado of ['ADMIN', 'administrador', 'root', true, 1, ['admin']]) {
      assert.equal(
        papelDe({ app_metadata: { papel: inventado } }),
        'funcionario',
        JSON.stringify(inventado)
      );
    }
  });
});

describe('quem pode abrir o quê', () => {
  test('o que é do administrador é reconhecido', () => {
    for (const caminho of SO_ADMIN) {
      assert.equal(soAdminPode(caminho), true, caminho);
    }
  });

  test('as telas do dia a dia continuam abertas ao funcionário', () => {
    for (const caminho of ['/painel', '/painel/pedidos', '/painel/clientes', '/painel/agenda', '/painel/precos', '/painel/ajustes']) {
      assert.equal(soAdminPode(caminho), false, caminho);
    }
  });

  test('o prefixo pega o que vem depois da barra', () => {
    assert.equal(soAdminPode('/api/admin/equipe/abc-123'), true);
    assert.equal(soAdminPode('/api/admin/equipe/abc-123/senha'), true);
    assert.equal(soAdminPode('/painel/financeiro/qualquer'), true);
  });

  /**
   * `/api/admin/despesas` e `/api/admin/despesas-fixas` são rotas diferentes.
   * Um prefixo comparado por `startsWith` cru faria a primeira engolir a
   * segunda — e o dia em que uma delas deixasse de ser só do administrador,
   * a outra iria junto sem ninguém notar.
   */
  test('um prefixo não engole o vizinho de nome parecido', () => {
    assert.equal(soAdminPode('/api/admin/despesas-fixas'), true);
    assert.equal(soAdminPode('/api/admin/equipexyz'), false);
    assert.equal(soAdminPode('/painel/financeiroxyz'), false);
  });

  test('rota parecida de fora não passa por dentro', () => {
    assert.equal(soAdminPode('/api/publico/servicos'), false);
    assert.equal(soAdminPode('/api/admin/pedidos'), false);
  });
});

describe('o papel que chega de fora', () => {
  test('só os dois valem', () => {
    assert.equal(ehPapel('admin'), true);
    assert.equal(ehPapel('funcionario'), true);
    for (const lixo of ['ADMIN', 'chefe', '', null, undefined, 3, {}]) {
      assert.equal(ehPapel(lixo), false, JSON.stringify(lixo));
    }
  });
});
