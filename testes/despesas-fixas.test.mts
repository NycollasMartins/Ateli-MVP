import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ocorrenciasAte, diaDoMes } from '../src/lib/despesas-fixas.ts';
import type { DespesaFixa } from '../src/lib/tipos.ts';

const fixa = (p: Partial<DespesaFixa> = {}): DespesaFixa => ({
  id: 'f1', descricao: 'Aluguel', categoria: 'Aluguel', valor_centavos: 90000,
  dia_do_mes: 5, ativa: true, comeca_em: '2026-06-01', criado_em: '', ...p,
});

const em = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d, 12);
};

describe('quem escolhe dia 31 recebe no último dia do mês', () => {
  test('fevereiro não vira 3 de março', () => {
    assert.equal(diaDoMes(em('2027-02-01'), 31).getDate(), 28);
    assert.equal(diaDoMes(em('2027-02-01'), 31).getMonth(), 1);
  });

  test('ano bissexto tem 29', () => {
    assert.equal(diaDoMes(em('2028-02-01'), 31).getDate(), 29);
  });

  test('mês de 30 dias para no 30', () => {
    assert.equal(diaDoMes(em('2027-04-01'), 31).getDate(), 30);
  });

  test('dia normal fica onde está', () => {
    assert.equal(diaDoMes(em('2027-04-01'), 5).getDate(), 5);
  });
});

describe('lança o que já venceu, e só isso', () => {
  test('recupera os meses desde o começo', () => {
    const datas = ocorrenciasAte(fixa(), em('2026-08-20')).map((o) => o.data);
    assert.deepEqual(datas, ['2026-06-05', '2026-07-05', '2026-08-05']);
  });

  test('não lança antes de o dia chegar', () => {
    const r = ocorrenciasAte(fixa({ comeca_em: '2026-08-01' }), em('2026-08-03'));
    assert.deepEqual(r, []);
  });

  test('lança no próprio dia do vencimento', () => {
    const r = ocorrenciasAte(fixa({ comeca_em: '2026-08-01' }), em('2026-08-05'));
    assert.deepEqual(r.map((o) => o.data), ['2026-08-05']);
  });

  test('cadastrada no meio do mês, lança o mês corrente', () => {
    // Ela está registrando um gasto que já teve; pode apagar se não for o caso.
    const r = ocorrenciasAte(fixa({ comeca_em: '2026-08-20' }), em('2026-08-25'));
    assert.deepEqual(r.map((o) => o.data), ['2026-08-05']);
  });

  test('cada mês tem uma competência só, para a trava do banco funcionar', () => {
    const r = ocorrenciasAte(fixa(), em('2026-08-20'));
    const competencias = r.map((o) => o.competencia);
    assert.equal(new Set(competencias).size, competencias.length);
    assert.deepEqual(competencias, ['2026-06-01', '2026-07-01', '2026-08-01']);
  });

  test('dia 31 gera datas diferentes por mês, sem repetir competência', () => {
    const r = ocorrenciasAte(fixa({ dia_do_mes: 31, comeca_em: '2027-01-01' }), em('2027-03-31'));
    assert.deepEqual(r.map((o) => o.data), ['2027-01-31', '2027-02-28', '2027-03-31']);
    assert.equal(new Set(r.map((o) => o.competencia)).size, 3);
  });

  test('não recupera anos e anos para trás', () => {
    const r = ocorrenciasAte(fixa({ comeca_em: '2000-01-01' }), em('2026-08-20'));
    assert.ok(r.length <= 25, `gerou ${r.length} lançamentos de uma vez`);
  });

  test('data de começo inválida não quebra', () => {
    assert.deepEqual(ocorrenciasAte(fixa({ comeca_em: '' }), em('2026-08-20')), []);
  });
});

describe('a geração de datas aguenta o calendário inteiro', () => {
  // Varredura no lugar de casos soltos: é a funcionalidade que a migração 009
  // vai reviver, e o erro aqui só apareceria meses depois, no lucro errado.
  const fixa = (dia: number, comeca: string): DespesaFixa => ({
    id: 'f', descricao: 'x', categoria: 'x', valor_centavos: 1,
    dia_do_mes: dia, ativa: true, comeca_em: comeca, criado_em: '',
  });

  test('o dia escolhido nunca vaza para outro mês, em 3 anos × 12 meses × 31 dias', () => {
    for (const ano of [2026, 2027, 2028]) {
      for (let mes = 0; mes < 12; mes++) {
        const competencia = new Date(ano, mes, 1, 12);
        const ultimo = new Date(ano, mes + 1, 0).getDate();
        for (let dia = 1; dia <= 31; dia++) {
          const d = diaDoMes(competencia, dia);
          assert.equal(d.getMonth(), mes, `dia ${dia} de ${ano}-${mes + 1} vazou de mês`);
          assert.equal(d.getDate(), Math.min(dia, ultimo), `dia ${dia} em ${ano}-${mes + 1}`);
        }
      }
    }
  });

  test('um ano rende doze competências, sem repetir nem pular, para qualquer dia', () => {
    for (let dia = 1; dia <= 31; dia++) {
      const r = ocorrenciasAte(fixa(dia, '2026-01-01'), new Date(2026, 11, 31, 12));
      const comps = r.map((o) => o.competencia);
      assert.equal(comps.length, 12, `dia ${dia} rendeu ${comps.length} meses`);
      assert.equal(new Set(comps).size, 12, `dia ${dia} repetiu competência`);
      for (const o of r) {
        assert.equal(o.data.slice(0, 7), o.competencia.slice(0, 7), `${o.data} fora de ${o.competencia}`);
      }
    }
  });

  test('nunca lança antes de o dia chegar, em todo par dia/hoje do mês', () => {
    for (let dia = 1; dia <= 28; dia++) {
      for (let hoje = 1; hoje <= 28; hoje++) {
        const r = ocorrenciasAte(fixa(dia, '2026-06-01'), new Date(2026, 5, hoje, 12));
        assert.equal(r.length, hoje >= dia ? 1 : 0, `vence dia ${dia}, hoje é ${hoje}`);
      }
    }
  });
});
