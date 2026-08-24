import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { montarCSV, centavosParaCSV } from '../src/lib/csv.ts';
import {
  cssDaMarca,
  normalizarHex,
  variaveisDeCor,
  avisoDeContraste,
  contraste,
  CONTRASTE_MINIMO,
  CORES_PADRAO,
} from '../src/lib/marca.ts';

describe('o CSV abre no Excel em português', () => {
  const linhas = (csv: string) => csv.replace(/^﻿/, '').trim().split('\r\n');

  test('começa com BOM, senão os acentos quebram', () => {
    assert.equal(montarCSV(['a'], [['b']]).charCodeAt(0), 0xfeff);
  });

  test('separa por ponto e vírgula, porque a vírgula é decimal aqui', () => {
    const [cabecalho] = linhas(montarCSV(['Tipo', 'Valor'], []));
    assert.equal(cabecalho, 'Tipo;Valor');
  });

  test('centavos viram número com vírgula decimal', () => {
    assert.equal(centavosParaCSV(7000), '70,00');
    assert.equal(centavosParaCSV(-3150), '-31,50');
    assert.equal(centavosParaCSV(0), '0,00');
  });
});

describe('o CSV não se estraga com texto difícil', () => {
  const primeira = (celulas: string[]) =>
    montarCSV(['x'], [celulas]).replace(/^﻿/, '').trim().split('\r\n')[1];

  test('ponto e vírgula dentro do texto vai entre aspas', () => {
    assert.equal(primeira(['Linha; zíper e botão']), '"Linha; zíper e botão"');
  });

  test('aspas viram aspas duplicadas', () => {
    assert.equal(primeira(['Vestido de "festa"']), '"Vestido de ""festa"""');
  });

  test('quebra de linha fica dentro da célula', () => {
    assert.match(primeira(['Aluguel\nagosto']), /^"Aluguel\nagosto"$/);
  });
});

describe('o CSV não vira fórmula no Excel', () => {
  // O nome da cliente vem do formulário aberto do QR: é entrada de estranho.
  const primeira = (celula: string) =>
    montarCSV(['x'], [[celula]]).replace(/^﻿/, '').trim().split('\r\n')[1];

  test('fórmula recebe apóstrofo e vira texto', () => {
    for (const ataque of ['=HYPERLINK("http://x")', '+1+1', '@SUM(A1)', '-2+3']) {
      assert.match(primeira(ataque), /'/, `passou sem proteção: ${ataque}`);
    }
  });

  test('valor negativo continua número, senão a coluna não soma', () => {
    // Foi o defeito real: o guard prefixava dinheiro negativo e quebrava a soma.
    for (const numero of ['-31,50', '-900,00', '70,00', '0,00']) {
      assert.equal(primeira(numero), numero, `${numero} deixou de ser número`);
    }
  });
});

describe('as cores da marca não deixam texto solto virar CSS', () => {
  test('hexadecimal válido passa, com ou sem #', () => {
    assert.equal(normalizarHex('#26362e', '#000000'), '#26362E');
    assert.equal(normalizarHex('2f5fa8', '#000000'), '#2F5FA8');
  });

  test('lixo cai na cor de reserva', () => {
    for (const ruim of ['vermelho', '#zzz', '', '   ', '#12345', 'rgb(1,2,3)']) {
      assert.equal(normalizarHex(ruim, '#ABCDEF'), '#ABCDEF');
    }
  });

  test('tentativa de fechar a tag <style> não chega ao CSS', () => {
    const css = cssDaMarca({
      ...CORES_PADRAO,
      mata: '</style><script>alert(1)</script>',
    });
    assert.doesNotMatch(css, /</);
    assert.doesNotMatch(css, /script/i);
    assert.match(css, /--cor-mata:38 54 46/);
  });

  test('o CSS só tem números e nomes de variável', () => {
    assert.match(cssDaMarca({ mata: '#4A2D5C', fita: '#F2A65A', giz: '#7B4AA8', linha: '#C9435E' }),
      /^:root\{(--cor-[a-z-]+:\d{1,3} \d{1,3} \d{1,3};?)+\}$/);
  });

  test('as variantes saem da cor base, em canais separados', () => {
    const v = variaveisDeCor(CORES_PADRAO);
    // canais soltos são o que faz o /50 de opacidade do Tailwind funcionar
    assert.equal(v['--cor-mata'], '38 54 46');
    assert.match(v['--cor-mata-escuro'], /^\d+ \d+ \d+$/);
    assert.notEqual(v['--cor-mata'], v['--cor-mata-escuro']);
  });
});

describe('a marca não deixa escolher cor ilegível', () => {
  test('cor escura passa sem aviso', () => {
    for (const [chave, cor] of Object.entries(CORES_PADRAO)) {
      assert.equal(
        avisoDeContraste(chave as keyof typeof CORES_PADRAO, cor),
        null,
        `a cor padrão ${chave} (${cor}) está sendo acusada`
      );
    }
  });

  test('amarelo claro é barrado onde a cor vira texto ou fundo escuro', () => {
    for (const chave of ['mata', 'giz', 'linha'] as const) {
      assert.ok(avisoDeContraste(chave, '#FFF176'), `${chave} aceitou amarelo claro`);
    }
  });

  test('a fita é fundo: o que a estraga é escurecer, não clarear', () => {
    assert.equal(avisoDeContraste('fita', '#FFF176'), null, 'fita clara foi acusada à toa');
    assert.ok(avisoDeContraste('fita', '#3A2E05'), 'fita escura demais passou');
  });

  test('branco é sempre barrado', () => {
    assert.ok(avisoDeContraste('mata', '#FFFFFF'));
  });

  test('o aviso fala com quem lê, não com programador', () => {
    const aviso = avisoDeContraste('giz', '#FFF176')!;
    assert.doesNotMatch(aviso, /contraste|WCAG|4\.5|luminânc/i, `jargão no aviso: ${aviso}`);
    assert.match(aviso, /escura|escuro/i);
  });

  test('cor inválida não gera aviso falso', () => {
    // enquanto ela digita "#8", não faz sentido acusar
    assert.equal(avisoDeContraste('mata', '#8'), null);
  });
});

describe('a paleta fixa é legível', () => {
  const PAPEL: [number, number, number] = [251, 251, 247];

  test('o texto suave se lê sobre o papel', () => {
    assert.ok(contraste([92, 104, 98], PAPEL) >= CONTRASTE_MINIMO);
  });

  test('a fita escura se lê sobre o fundo do selo "Pronta"', () => {
    // era 3.01 no original e 2.84 depois de eu derivar; agora passa
    const fitaEscura = variaveisDeCor(CORES_PADRAO)['--cor-fita-escura']
      .split(' ')
      .map(Number) as [number, number, number];
    assert.ok(
      contraste(fitaEscura, [252, 246, 229]) >= CONTRASTE_MINIMO,
      'o selo "Pronta" voltou a ficar ilegível'
    );
  });
});
