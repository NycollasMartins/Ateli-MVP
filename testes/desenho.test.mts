import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guardas do sistema visual.
 *
 * As regras de desenho estavam escritas na documentação e não tinham quem as
 * fizesse cumprir. Uma tela nova com cor fixa não acompanha a marca do cliente
 * — e isso só apareceria quando alguém trocasse as cores e visse metade do
 * painel continuar verde.
 */
function arquivos(dir: string, extensao: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho, extensao);
    return caminho.endsWith(extensao) ? [caminho] : [];
  });
}

const TELAS = arquivos('src', '.tsx');
const fontesTs = () => arquivos('src', '.ts');

/**
 * O corpo de uma função, do `{` de abertura até a chave que o fecha.
 *
 * Cortar no primeiro `\n  }` parece funcionar e não funciona: num arquivo de
 * nível zero isso cai no meio de um `});`, antes do `catch` e do `throw`, e o
 * guarda acusa código correto.
 */
function corpoDaFuncao(fonte: string, desde: number) {
  const abre = fonte.indexOf('{', desde);
  if (abre === -1) return '';
  let prof = 0;
  for (let i = abre; i < fonte.length; i++) {
    if (fonte[i] === '{') prof++;
    else if (fonte[i] === '}' && --prof === 0) return fonte.slice(abre, i + 1);
  }
  return fonte.slice(abre);
}
const HEX = /#[0-9A-Fa-f]{6}\b/;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

describe('a interface não tem cor fixa', () => {
  test('há telas para conferir', () => {
    assert.ok(TELAS.length > 10, `só ${TELAS.length} arquivos .tsx encontrados`);
  });

  test('todo hexadecimal em tela tem justificativa marcada', () => {
    const soltos: string[] = [];

    for (const arquivo of TELAS) {
      const linhas = readFileSync(arquivo, 'utf8').split('\n');
      linhas.forEach((linha, i) => {
        if (!HEX.test(linha)) return;

        // A justificativa vale para o bloco: conta da linha em branco anterior
        // até aqui, no máximo 12 linhas. Assim um grupo de cores declaradas
        // juntas precisa de um comentário só, e uma cor solta trinta linhas
        // abaixo não é absolvida por ele.
        let inicio = i;
        while (inicio > 0 && linhas[inicio - 1].trim() !== '' && i - inicio < 12) inicio--;

        const contexto = linhas.slice(inicio, i + 1).join('\n');
        if (!contexto.includes('cor-fixa:')) soltos.push(`${arquivo}:${i + 1}  ${linha.trim()}`);
      });
    }

    assert.deepEqual(
      soltos,
      [],
      'cor fixa sem justificativa — use as classes (bg-mata, fill-fita) para acompanhar a ' +
        'marca do cliente, ou marque a exceção com "cor-fixa: motivo":\n' + soltos.join('\n')
    );
  });
});

describe('a interface não tem emoji', () => {
  test('nenhuma tela usa emoji', () => {
    const achados = TELAS.filter((a) => EMOJI.test(readFileSync(a, 'utf8')));
    assert.deepEqual(achados, [], `emoji na interface: ${achados.join(', ')}`);
  });
});

describe('o .env.example acompanha o que o código exige', () => {
  test('toda variável obrigatória aparece no exemplo', async () => {
    const exemplo = readFileSync('.env.example', 'utf8');
    const { faltaConfigurar } = await import('../src/lib/configuracao.ts');

    // sem nada preenchido, faltaConfigurar() lista todas as obrigatórias
    const anterior: Record<string, string | undefined> = {};
    for (const v of faltaConfigurar()) anterior[v.nome] = process.env[v.nome];

    const obrigatorias = faltaConfigurar().map((v) => v.nome);
    assert.ok(obrigatorias.length > 0, 'nenhuma variável obrigatória declarada');

    for (const nome of obrigatorias) {
      assert.match(
        exemplo,
        new RegExp(`^${nome}=`, 'm'),
        `${nome} é obrigatória mas não está no .env.example — quem clonar o projeto não vai saber`
      );
    }
  });
});

/**
 * Todo campo precisa de nome acessível.
 *
 * Sem ele, quem usa leitor de tela ou comando de voz ouve "campo de texto"
 * quatro vezes seguidas e não sabe qual é qual. `placeholder` não serve: some
 * ao digitar e nem todo leitor anuncia.
 */
function fimDaTag(fonte: string, i: number) {
  let prof = 0;
  let aspas: string | null = null;
  while (i < fonte.length) {
    const c = fonte[i];
    if (aspas) {
      if (c === aspas) aspas = null;
    } else if (c === '"' || c === "'") aspas = c;
    else if (c === '{') prof++;
    else if (c === '}') prof--;
    else if (c === '>' && prof === 0) return i;
    i++;
  }
  return fonte.length;
}

describe('todo campo tem nome acessível', () => {
  test('nenhum input, select ou textarea fica sem nome', () => {
    const semNome: string[] = [];

    for (const arquivo of TELAS) {
      const fonte = readFileSync(arquivo, 'utf8');
      for (const m of fonte.matchAll(/<(input|select|textarea)\b/g)) {
        const inicio = m.index! + m[0].length;
        const attrs = fonte.slice(inicio, fimDaTag(fonte, inicio));
        if (attrs.includes('type="hidden"')) continue;

        const id = /\bid="([^"]+)"/.exec(attrs);
        const temFor = id ? fonte.includes(`htmlFor="${id[1]}"`) : false;
        const antes = fonte.slice(Math.max(0, m.index! - 400), m.index!);
        const dentroDeLabel = antes.lastIndexOf('<label') > antes.lastIndexOf('</label>');

        if (!temFor && !dentroDeLabel && !attrs.includes('aria-label')) {
          semNome.push(`${arquivo}:${fonte.slice(0, m.index!).split('\n').length}  <${m[1]}>`);
        }
      }
    }

    assert.deepEqual(
      semNome,
      [],
      'campo sem nome acessível — use <label htmlFor>, envolva com <label>, ou aria-label:\n' +
        semNome.join('\n')
    );
  });
});

/**
 * Janela que abre por cima precisa se anunciar como tal.
 *
 * Sem `role="dialog"`, o leitor de tela continua lendo a página atrás; sem
 * gestão de foco, quem usa teclado tabula a página inteira antes de chegar
 * aos campos, e ao fechar recomeça do topo.
 */
describe('toda janela modal se anuncia e cuida do foco', () => {
  test('quem tem sobreposição de tela inteira é uma janela declarada', () => {
    const faltando: string[] = [];

    for (const arquivo of TELAS) {
      const fonte = readFileSync(arquivo, 'utf8');
      // sobreposição que cobre a tela e escurece o fundo = janela modal
      if (!/fixed inset-0[^"]*z-\[?\d/.test(fonte) || !/bg-mata-escuro\//.test(fonte)) continue;

      for (const marca of ['role="dialog"', 'aria-modal="true"', 'tabIndex={-1}', 'useJanelaModal']) {
        if (!fonte.includes(marca)) faltando.push(`${arquivo}: falta ${marca}`);
      }
    }

    assert.deepEqual(faltando, [], `janela modal incompleta:\n${faltando.join('\n')}`);
  });
});

describe('gráfico não esconde a informação de quem não enxerga', () => {
  test('todo gráfico tem os mesmos números em texto', () => {
    const mudos = TELAS.filter((a) => {
      const fonte = readFileSync(a, 'utf8');
      return fonte.includes('role="img"') && !fonte.includes('sr-only');
    });

    assert.deepEqual(
      mudos,
      [],
      'gráfico sem alternativa em texto — quem usa leitor de tela fica sem o dado nenhum:\n' +
        mudos.join('\n')
    );
  });
});

describe('o teclado consegue pular o menu', () => {
  test('o painel tem atalho para o conteúdo', () => {
    const layout = readFileSync('src/app/painel/layout.tsx', 'utf8');
    assert.match(layout, /href="#conteudo"/, 'sem atalho: são nove itens de menu a cada página');
    assert.match(layout, /id="conteudo"/, 'o atalho aponta para um destino que não existe');
    assert.ok(
      layout.indexOf('href="#conteudo"') < layout.indexOf('<Navegacao'),
      'o atalho precisa vir antes do menu, senão não adianta'
    );
  });
});

/**
 * Ação de tela que fala com o servidor precisa dizer quando falha.
 *
 * Sem isso o clique não faz nada e não explica nada — a costureira clica de
 * novo, e de novo, achando que o botão está quebrado.
 */
describe('nada engole erro em silêncio', () => {
  test('não existe catch de corpo vazio no código', () => {
    // Meu guarda anterior só olhava quem chamava enviar(); um `.catch(() => {})`
    // num fetch cru passou batido e deixou a Agenda sem dizer que o Google caiu.
    const todos = [...TELAS, ...fontesTs()];
    const vazios: string[] = [];

    for (const arquivo of todos) {
      const fonte = readFileSync(arquivo, 'utf8');
      fonte.split('\n').forEach((linha, i) => {
        if (/catch\s*\(\s*(\(\s*\)\s*=>\s*)?\{\s*\}\s*\)?/.test(linha)) {
          vazios.push(`${arquivo}:${i + 1}  ${linha.trim()}`);
        }
      });
    }

    assert.deepEqual(
      vazios,
      [],
      'erro engolido — lista vazia e calada faz quem usa achar que o dado não existe:\n' +
        vazios.join('\n')
    );
  });
});

describe('quem busca no servidor trata a falha ou a repassa', () => {
  test('nenhuma função chama fetch() sem catch e sem throw', () => {
    // Terceiro ponto cego dos meus guardas: `catch(() => {})` e `enviar()` já
    // eram cobertos, mas função com `fetch` cru e **nenhum** catch passava.
    // `pegar`/`enviar` são exceção legítima: lançam de propósito, para quem
    // chama tratar — por isso a presença de `throw` absolve.
    const soltas: string[] = [];

    for (const arquivo of [...TELAS, ...fontesTs()]) {
      const fonte = readFileSync(arquivo, 'utf8');
      const inicios = [
        ...fonte.matchAll(/(?:async function (\w+)|const (\w+)\s*=\s*useCallback\(async|const (\w+) = async)/g),
      ];

      for (const m of inicios) {
        const nome = m[1] ?? m[2] ?? m[3];
        const corpo = corpoDaFuncao(fonte, m.index! + m[0].length);

        if (corpo.includes('fetch(') && !corpo.includes('catch') && !corpo.includes('throw')) {
          soltas.push(`${arquivo}  ${nome}()`);
        }
      }
    }

    assert.deepEqual(
      soltas,
      [],
      'falha de rede vira tela travada ou lista vazia mentindo:\n' + soltas.join('\n')
    );
  });
});

describe('ação de tela nunca falha calada', () => {
  test('toda função que chama enviar() trata o erro', () => {
    const caladas: string[] = [];

    for (const arquivo of TELAS) {
      const fonte = readFileSync(arquivo, 'utf8');
      const inicios = [...fonte.matchAll(/(?:async function (\w+)|const (\w+) = async)\s*\([^)]*\)\s*\{/g)];

      for (const m of inicios) {
        const nome = m[1] ?? m[2];
        // este padrão já consome a `{` da função: recuar um caractere faz o
        // extrator começar nela, e não na `{` do primeiro `try` de dentro
        const corpo = corpoDaFuncao(fonte, m.index! + m[0].length - 1);

        if (corpo.includes('enviar(') && !corpo.includes('catch')) {
          caladas.push(`${arquivo}  ${nome}()`);
        }
      }
    }

    assert.deepEqual(
      caladas,
      [],
      'falha sem aviso na tela — envolva em try/catch e chame avisar(..., "erro"):\n' +
        caladas.join('\n')
    );
  });
});

/**
 * O cartaz do QR vai impresso para a parede. Endereço errado é papel jogado
 * fora e cliente que não consegue deixar a peça — e não dá para corrigir
 * depois de colado.
 */
describe('o cartaz do QR avisa antes de sair errado', () => {
  const pagina = readFileSync('src/app/painel/qrcode/page.tsx', 'utf8');

  test('a tela usa o detector compartilhado, e não um regex solto', () => {
    // o comportamento está coberto em testes/endereco.test.mts
    assert.match(pagina, /ehEnderecoDeTeste\(base\)/, 'a detecção voltou a ser feita à mão aqui');
  });

  test('o aviso não vai junto na impressão', () => {
    // o cartaz impresso não pode sair com recado de configuração no meio
    const trecho = pagina.slice(pagina.indexOf('enderecoDeTeste &&'), pagina.indexOf('cartaz que sai'));
    assert.match(trecho, /sem-impressao/, 'o aviso sairia impresso no cartaz');
  });

  test('o aviso diz qual variável arrumar', () => {
    assert.match(pagina, /NEXT_PUBLIC_APP_URL/);
  });
});

/**
 * O formulário do QR é o que traz pedido para dentro. Um botão de enviar solto
 * do formulário parece funcionar, mas pula a checagem do navegador: a cliente
 * só descobre o que faltou depois da viagem ao servidor.
 */
describe('o formulário do QR envia de um jeito só', () => {
  const pagina = readFileSync('src/app/f/page.tsx', 'utf8');

  test('todo botão de enviar pertence ao formulário', () => {
    for (const m of pagina.matchAll(/<button\b([^>]*type="submit"[^>]*)>/g)) {
      const attrs = m[1];
      const dentro = pagina.slice(pagina.indexOf('<form'), m.index!).lastIndexOf('</form>') === -1;
      assert.ok(
        dentro || attrs.includes('form="pedido"'),
        `botão de enviar fora do formulário e sem form="pedido":\n${m[0]}`
      );
    }
  });

  test('o envio trava contra o segundo disparo', () => {
    // o Enter num campo dispara o formulário, e o botão desabilitado não segura.
    // A trava pode citar outros estados além de `enviando`; o que não pode é
    // `submeter()` seguir em frente quando já está enviando.
    const submeter = corpoDaFuncao(pagina, pagina.indexOf('async function submeter'));
    assert.match(submeter, /if \(enviando[^)]*\) return;/, 'sem trava, dois Enter viram dois pedidos');
  });
});

/**
 * Fechar o caixa é coisa de segunda de manhã, pensando na semana que acabou.
 * Um botão que diz só "fechar a semana" fecha a que começou — quase vazia — e
 * a encerrada fica sem registro, sem jeito de voltar nela.
 */
describe('fechar o caixa diz qual semana', () => {
  const pagina = readFileSync('src/app/painel/financeiro/page.tsx', 'utf8');

  test('o botão traz as datas da semana', () => {
    assert.match(
      pagina,
      /o caixa de \{dataCurta/,
      'o botão não diz qual semana está fechando'
    );
  });

  test('dá para fechar a semana passada, se ela ficou aberta', () => {
    assert.match(pagina, /passadaAberta/, 'sem saída para quem não fechou no domingo');
    assert.match(pagina, /Fechar a semana passada/);
  });

  test('a função recebe a semana, em vez de assumir a corrente', () => {
    assert.match(
      pagina,
      /async function fecharCaixa\(inicio: Date, fim: Date\)/,
      'fecharCaixa voltou a assumir a semana corrente'
    );
  });
});

/**
 * A aritmética de período mora em src/lib/periodo.ts e é coberta por
 * varredura em testes/periodo.test.mts. Aqui só se garante que a tela não
 * voltou a fazer a conta à mão — cinco guardas antigos liam este arquivo
 * atrás de `Math.max(0, r - 1)` e afins, acusando refatoração inocente e
 * absolvendo quebra escrita de outro jeito.
 */
describe('o Financeiro usa a aritmética compartilhada', () => {
  const pagina = readFileSync('src/app/painel/financeiro/page.tsx', 'utf8');

  test('o período vem de periodoDe(), não de contas soltas na tela', () => {
    assert.match(pagina, /periodoDe\(hoje, periodo, recuo\)/, 'a conta voltou para dentro da tela');
    assert.doesNotMatch(pagina, /startOfMonth\(hoje\)/, 'o mês voltou a ser sempre o corrente');
  });

  test('o fechamento de caixa não segue a navegação', () => {
    // o recuo é só de leitura: fechar o caixa tem que olhar semanas reais
    assert.match(pagina, /fecharCaixa\(iniSemana, fimSem\)/);
  });
});

/**
 * Ação destrutiva pergunta antes.
 *
 * O painel pedia confirmação para apagar uma foto e para tirar o logo, mas
 * **não** para cancelar um pedido — que apaga o evento do Google, tira o
 * dinheiro do caixa e não tem desfazer.
 */
describe('botão de perigo pergunta antes', () => {
  test('todo btn-perigo chama uma função que confirma', () => {
    const semPergunta: string[] = [];

    for (const arquivo of TELAS) {
      const fonte = readFileSync(arquivo, 'utf8');

      // `(?!<button)` prende a janela ao <button mais próximo do btn-perigo. Sem
      // isso ela começava num botão anterior e conferia a função errada: acusava
      // o inocente e, pior, absolvia o perigoso quando o vizinho tinha `confirm`.
      for (const m of fonte.matchAll(/<button\b(?:(?!<button)[\s\S]){0,600}?btn-perigo[\s\S]{0,200}?>/g)) {
        const tag = m[0];
        // `onClick={nome}` ou `onClick={() => nome(...)}`
        const alvo = /onClick=\{(?:\(\)\s*=>\s*)?(\w+)/.exec(tag)?.[1];
        if (!alvo) {
          semPergunta.push(`${arquivo}: btn-perigo sem onClick reconhecível`);
          continue;
        }

        // busca literal em vez de RegExp montado: escapar `\s` através de
        // camadas de string é exatamente como este guarda nasceu quebrado,
        // procurando uma barra literal e absolvendo todo mundo em silêncio
        const posicao = ['const ' + alvo, 'function ' + alvo]
          .map((forma) => fonte.indexOf(forma))
          .filter((i) => i !== -1)
          .sort((a, b) => a - b)[0];

        if (posicao === undefined) continue; // definido fora deste arquivo

        const corpo = corpoDaFuncao(fonte, posicao);
        if (!corpo.includes('confirm')) semPergunta.push(`${arquivo}: ${alvo}() não pergunta nada`);
      }
    }

    assert.deepEqual(
      semPergunta,
      [],
      'ação sem volta disparando no primeiro clique:\n' + semPergunta.join('\n')
    );
  });
});

/**
 * Silenciar a regra de dependências esconde exatamente o erro que ela existe
 * para pegar: um `useMemo` com a lista incompleta congela o valor quando a
 * tela ganha um estado novo. Foi assim que o rótulo do maior gasto passou a
 * mostrar o período anterior depois que a navegação chegou.
 */
describe('a regra de dependências não é silenciada', () => {
  test('nenhum eslint-disable de exhaustive-deps no código', () => {
    const silenciados = [...TELAS, ...fontesTs()].filter((a) =>
      readFileSync(a, 'utf8').includes('react-hooks/exhaustive-deps')
    );

    assert.deepEqual(
      silenciados,
      [],
      'tire o disable: mova a conta para fora do hook, ou declare tudo:\n' + silenciados.join('\n')
    );
  });
});

/**
 * A decisão de qual mensagem mandar precisa existir num lugar só.
 *
 * Estava em dois — o cartaz da Visão geral e o painel do pedido —, e quando a
 * regra aprendeu a tratar peça atrasada, o painel ficou para trás: abrir uma
 * peça que passou do dia oferecia a mensagem da data, prometendo à cliente um
 * dia que já tinha passado.
 *
 * A checagem é literal de propósito. Uma versão anterior tentava reconhecer o
 * ternário pelo padrão do texto e se enganava sozinha, absolvendo o arquivo.
 */
describe('qual mensagem mandar é decidido num lugar só', () => {
  test('quem mostra o botão de avisar usa avisoSugerido()', () => {
    for (const arquivo of ['src/components/PainelPedido.tsx', 'src/components/AvisarClientes.tsx']) {
      const fonte = readFileSync(arquivo, 'utf8');
      assert.ok(
        fonte.includes("from '@/lib/avisos'"),
        `${arquivo} decide o tipo de aviso por conta própria`
      );
    }
  });

  test('só avisos.ts sabe montar a decisão', () => {
    const fonte = readFileSync('src/lib/avisos.ts', 'utf8');
    for (const tipo of ['marcada', 'vespera', 'pronta', 'atrasada']) {
      assert.ok(fonte.includes(`'${tipo}'`), `avisos.ts não decide sobre ${tipo}`);
    }
  });
});

/**
 * A busca precisa ser a mesma em toda tela.
 *
 * Eram duas: a de Pedidos comparava o telefone cru — quem copiasse o número do
 * WhatsApp não achava o pedido salvo como `(11) 98765-4321` — e nenhuma das
 * duas tirava acento, então "conceicao" não achava "Conceição".
 */
describe('a busca é a mesma em toda tela', () => {
  test('quem tem campo de busca usa casaComBusca()', () => {
    for (const arquivo of TELAS) {
      const fonte = readFileSync(arquivo, 'utf8');
      if (!/aria-label="Buscar/.test(fonte)) continue;
      assert.ok(
        fonte.includes("from '@/lib/busca'"),
        `${arquivo} filtra por conta própria — acento e telefone vão divergir`
      );
    }
  });
});

/**
 * O painel se atualiza sozinho a cada 12 segundos e troca o pedido aberto
 * quando ele muda no banco. Sem trava, a ajudante marcar a peça como pronta em
 * outra sessão — ou uma segunda aba fazer qualquer coisa — reinicia o
 * formulário no meio da frase, e o que ela digitou some sem explicação.
 *
 * Passou a ser alcançável quando o login virou um por pessoa.
 */
describe('edição não salva não é apagada pela atualização automática', () => {
  const painel = readFileSync('src/components/PainelPedido.tsx', 'utf8');

  test('o painel sabe que há coisa não salva', () => {
    assert.match(painel, /mexido/, 'nada distingue formulário tocado de intocado');
    assert.match(painel, /editando\(set/, 'os campos não marcam a edição');
  });

  test('todo campo do formulário marca a edição', () => {
    for (const campo of ['setData', 'setHora', 'setValor', 'setSinal', 'setObs', 'setForma']) {
      assert.ok(painel.includes(`editando(${campo})`), `${campo} não marca a edição`);
    }
  });

  test('mudança de fora avisa em vez de sobrescrever', () => {
    assert.match(painel, /setMudouPorFora\(true\)/, 'a mudança externa passa batida');
    assert.match(painel, /Alguém mexeu neste pedido/, 'não avisa nada a quem está digitando');
  });

  test('trocar de pedido continua trocando o formulário', () => {
    // a trava vale para o mesmo pedido; abrir outro tem que recarregar tudo
    assert.match(painel, /outroPedido/, 'abrir outro pedido pode manter o formulário antigo');
  });

  test('salvar limpa a pendência', () => {
    assert.match(painel, /mexido\.current = false;/);
  });
});

/**
 * A câmera boa do celular produz foto de 6 a 8 MB — justo as melhores. Conferir
 * o limite de 5 MB antes de encolher recusava exatamente essas, com uma
 * mensagem que culpava o arquivo da cliente.
 */
describe('a foto encolhe antes de ser medida', () => {
  const formulario = readFileSync('src/app/f/page.tsx', 'utf8');

  test('a redução acontece ao escolher, não ao enviar', () => {
    const escolher = corpoDaFuncao(formulario, formulario.indexOf('async function escolherFotos'));
    assert.match(escolher, /await reduzirFoto\(/, 'escolher não encolhe');
    assert.ok(
      escolher.indexOf('reduzirFoto') < escolher.indexOf('TAMANHO_MAXIMO'),
      'o tamanho é conferido antes de encolher'
    );
  });

  test('enviar não pode disparar no meio do preparo', () => {
    // sem isto, tocar em enviar durante a redução mandaria o pedido sem as fotos
    assert.match(formulario, /if \(enviando \|\| preparando\) return;/);
    assert.equal(
      (formulario.match(/disabled=\{enviando \|\| preparando\}/g) ?? []).length,
      2,
      'algum caminho de envio ficou destravado durante o preparo'
    );
  });
});
