import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { categoriaQueMaisPesa } from '../src/lib/despesas.ts';
import type { Despesa } from '../src/lib/tipos.ts';

const d = (categoria: string, valor: number): Despesa => ({
  id: Math.random().toString(36).slice(2),
  descricao: 'x',
  categoria,
  valor_centavos: valor,
  data: '2026-08-01',
  observacao: null,
  despesa_fixa_id: null,
  competencia: null,
  criado_em: '',
});

describe('a categoria que mais pesa', () => {
  test('soma por categoria, não conta lançamentos', () => {
    // Materiais tem mais lançamentos, Aluguel tem mais dinheiro
    const gastos = [d('Materiais', 1000), d('Materiais', 1500), d('Materiais', 900), d('Aluguel', 90000)];
    assert.match(categoriaQueMaisPesa(gastos)!, /aluguel/);
  });

  test('período sem despesa não inventa rótulo', () => {
    assert.equal(categoriaQueMaisPesa([]), null);
  });

  test('só zeros também não', () => {
    assert.equal(categoriaQueMaisPesa([d('Contas', 0), d('Aluguel', 0)]), null);
  });

  test('empate não faz o rótulo dançar entre buscas', () => {
    // sem desempate estável, a mesma tela mostraria categorias diferentes a
    // cada atualização automática
    const gastos = [d('Aluguel', 5000), d('Contas', 5000)];
    const primeira = categoriaQueMaisPesa(gastos);
    for (let i = 0; i < 20; i++) {
      assert.equal(categoriaQueMaisPesa([...gastos].reverse()), primeira);
    }
  });

  test('a frase fala com quem lê', () => {
    const texto = categoriaQueMaisPesa([d('Materiais', 100)])!;
    assert.equal(texto, 'materiais é o maior gasto');
  });

  test('cada período tem a sua categoria — não sobra do anterior', () => {
    // era o defeito: o memo sem `recuo` congelava o rótulo do período de antes
    const agosto = [d('Aluguel', 90000), d('Materiais', 1000)];
    const julho = [d('Materiais', 50000), d('Aluguel', 1000)];
    assert.match(categoriaQueMaisPesa(agosto)!, /aluguel/);
    assert.match(categoriaQueMaisPesa(julho)!, /materiais/);
  });
});
