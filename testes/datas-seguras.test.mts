import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function fontes(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return fontes(caminho);
    return /\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

const ARQUIVOS = fontes('src');

/** Ler um arquivo já sem os comentários, para não acusar o que está explicado. */
const semComentarios = (caminho: string) =>
  readFileSync(caminho, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
    .join('\n');

/**
 * Colunas `date` puras do banco. Passar qualquer uma destas por `new Date()`
 * faz o navegador ler como meia-noite UTC e voltar um dia no fuso do Brasil.
 */
const COLUNAS_DE_DIA = ['retirada_em', 'comeca_em', 'competencia', 'semana_inicio', 'semana_fim'];

describe('data de dia inteiro nunca vira Date pelo caminho errado', () => {
  test('há arquivos para conferir', () => {
    assert.ok(ARQUIVOS.length > 20, `só ${ARQUIVOS.length} arquivos encontrados`);
  });

  test('nenhuma coluna de dia passa por new Date()', () => {
    const erradas: string[] = [];

    for (const arquivo of ARQUIVOS) {
      const fonte = semComentarios(arquivo);
      for (const coluna of COLUNAS_DE_DIA) {
        // só a forma perigosa: um argumento só, o texto da coluna.
        // `new Date(ano, mes, dia)` é o construtor numérico e é seguro — tem
        // vírgula antes do parêntese de fecho, então não casa aqui.
        const padrao = new RegExp(
          `new Date\\(\\s*[\\w.!?\\[\\]'"]*\\b${coluna}\\b[\\w.!?\\[\\]'"]*\\s*\\)`
        );
        if (padrao.test(fonte)) erradas.push(`${arquivo}: new Date(… ${coluna} …)`);
      }
    }

    assert.deepEqual(
      erradas,
      [],
      'use dataLocal() — new Date() sobre coluna `date` volta um dia no fuso de Brasília:\n' +
        erradas.join('\n')
    );
  });

  test('ninguém usa toISOString() para extrair o dia', () => {
    const erradas = ARQUIVOS.filter((a) => /toISOString\(\)\s*\.\s*(slice|substring|split)/.test(semComentarios(a)));
    assert.deepEqual(
      erradas,
      [],
      `use isoDia() no navegador, hojeNoAtelie() no servidor:\n${erradas.join('\n')}`
    );
  });
});

describe('a semana comercial vem de um lugar só', () => {
  test('startOfWeek e endOfWeek só existem dentro de formato.ts', () => {
    const fora = ARQUIVOS.filter(
      (a) => a !== join('src', 'lib', 'formato.ts') && /\b(startOfWeek|endOfWeek)\b/.test(semComentarios(a))
    );
    assert.deepEqual(
      fora,
      [],
      'use inicioSemana()/fimSemana(): o padrão do date-fns começa a semana no domingo, e ' +
        `aqui ela começa na segunda:\n${fora.join('\n')}`
    );
  });

  test('quem embrulha declara o começo na segunda', () => {
    const formato = readFileSync(join('src', 'lib', 'formato.ts'), 'utf8');
    const usos = formato.match(/(startOfWeek|endOfWeek)\([^)]*\)/g) ?? [];
    assert.ok(usos.length >= 2, 'não achei os embrulhos de semana');
    for (const uso of usos) {
      assert.match(uso, /weekStartsOn:\s*1/, `${uso} sem weekStartsOn: 1`);
    }
  });
});

/**
 * "Hoje" não pode ser calculado uma vez e guardado.
 *
 * Painel esquecido aberto — tablet na parede, aba que nunca fecha — vira a
 * noite mostrando o dia errado, e nada na tela avisa.
 */
describe('o dia de hoje não congela', () => {
  /** Acha o ')' que fecha a chamada, contando os parênteses de dentro. */
  function fimDaChamada(fonte: string, i: number) {
    let prof = 1;
    while (i < fonte.length && prof > 0) {
      if (fonte[i] === '(') prof++;
      else if (fonte[i] === ')') prof--;
      i++;
    }
    return i;
  }

  test('nenhum useMemo/useState de dependência vazia guarda a data', () => {
    const congelados: string[] = [];

    for (const arquivo of ARQUIVOS) {
      const fonte = semComentarios(arquivo);
      // `useCallback` fica de fora: ele guarda a função, e a data é calculada
      // quando ela roda. Quem congela é `useMemo`/`useState`, que guardam o valor.
      for (const m of fonte.matchAll(/use(?:Memo|State)\(/g)) {
        const inicio = m.index! + m[0].length;
        const chamada = fonte.slice(inicio, fimDaChamada(fonte, inicio) - 1);

        const semDependencia = /,\s*\[\s*\]\s*$/.test(chamada.trim());
        if (semDependencia && /new Date\(\)|Date\.now\(\)/.test(chamada)) {
          congelados.push(`${arquivo}:${fonte.slice(0, m.index!).split('\n').length}`);
        }
      }
    }

    assert.deepEqual(
      congelados,
      [],
      'a data ficaria presa ao momento em que a página abriu:\n' + congelados.join('\n')
    );
  });
});
