import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SO_ADMIN } from '../src/lib/acesso.ts';

function rotas(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return rotas(caminho);
    return nome === 'route.ts' ? [caminho] : [];
  });
}

const METODO = /export async function (GET|POST|PUT|PATCH|DELETE)\b/;

describe('nenhuma rota protegida confia só no middleware', () => {
  const arquivos = rotas('src/app/api/admin');

  test('há rotas para conferir', () => {
    assert.ok(arquivos.length > 10, `só ${arquivos.length} rotas de admin encontradas`);
  });

  test('todo método de /api/admin revalida a sessão', () => {
    const desprotegidos: string[] = [];

    for (const arquivo of arquivos) {
      const fonte = readFileSync(arquivo, 'utf8');
      // separa o corpo de cada método exportado
      for (const parte of fonte.split(/(?=export async function (?:GET|POST|PUT|PATCH|DELETE)\b)/)) {
        const m = METODO.exec(parte);
        if (m && !/estaLogado|usuarioAtual|exigirAdmin/.test(parte)) {
          desprotegidos.push(`${arquivo} -> ${m[1]}`);
        }
      }
    }

    assert.deepEqual(
      desprotegidos,
      [],
      'rota de admin sem revalidar a sessão. O middleware sozinho não basta:\n' +
        desprotegidos.join('\n')
    );
  });
});

describe('o que é só do administrador confere o papel', () => {
  // Os prefixos vêm do mesmo lugar que o proxy usa, para a lista não sair de
  // sincronia: acrescentar rota lá e esquecer aqui derrubaria a prova.
  const soAdmin = SO_ADMIN.filter((p) => p.startsWith('/api/'));

  const arquivosDe = (prefixo: string) => {
    const dir = join('src/app', prefixo);
    return existsSync(dir) ? rotas(dir) : [];
  };

  test('há rotas de administrador para conferir', () => {
    const todas = soAdmin.flatMap(arquivosDe);
    assert.ok(todas.length >= 6, `só ${todas.length} rotas de administrador encontradas`);
  });

  test('todo método delas exige administrador', () => {
    const frouxos: string[] = [];

    for (const prefixo of soAdmin) {
      for (const arquivo of arquivosDe(prefixo)) {
        const fonte = readFileSync(arquivo, 'utf8');
        for (const parte of fonte.split(/(?=export async function (?:GET|POST|PUT|PATCH|DELETE)\b)/)) {
          const m = METODO.exec(parte);
          if (m && !/exigirAdmin|papelDe/.test(parte)) {
            frouxos.push(`${arquivo} -> ${m[1]}`);
          }
        }
      }
    }

    assert.deepEqual(
      frouxos,
      [],
      'rota que só o administrador deveria usar aceita funcionário. Conferir a\n' +
        'sessão não basta: funcionário tem sessão válida.\n' +
        frouxos.join('\n')
    );
  });
});

describe('as migrações do banco não se perdem', () => {
  const numeradas = readdirSync('supabase')
    .filter((n) => /^\d{3}-.*\.sql$/.test(n))
    .sort();

  test('há migrações para conferir', () => {
    assert.ok(numeradas.length >= 5, `só ${numeradas.length} migrações encontradas`);
  });

  test('a numeração não pula nem repete', () => {
    const numeros = numeradas.map((n) => Number(n.slice(0, 3)));
    assert.deepEqual(
      numeros,
      numeros.map((_, i) => i + 1),
      `numeração fora de ordem: ${numeradas.join(', ')}`
    );
  });

  test('toda migração está listada no LEIA-ME', () => {
    // é a lista que a pessoa segue para publicar; arquivo fora dela não roda
    const leiame = readFileSync('supabase/LEIA-ME.md', 'utf8');
    const esquecidas = numeradas.filter((n) => !leiame.includes(n));
    assert.deepEqual(esquecidas, [], `migração fora do LEIA-ME: ${esquecidas.join(', ')}`);
  });

  test('tabela nova sempre vem com RLS ligada', () => {
    // sem isso a tabela fica legível pela chave pública do navegador
    const semTrava: string[] = [];

    for (const arquivo of numeradas) {
      const sql = readFileSync(join('supabase', arquivo), 'utf8').toLowerCase();
      const criadas = [...sql.matchAll(/create table if not exists (\w+)/g)].map((m) => m[1]);
      for (const tabela of criadas) {
        // as migrações alinham as colunas, então o espaçamento varia
        const ligaRls = new RegExp(`alter\\s+table\\s+${tabela}\\s+enable\\s+row\\s+level\\s+security`);
        if (!ligaRls.test(sql)) {
          semTrava.push(`${arquivo}: ${tabela}`);
        }
      }
    }

    assert.deepEqual(semTrava, [], `tabela criada sem RLS:\n${semTrava.join('\n')}`);
  });
});

/**
 * Rede embaixo da tela.
 *
 * Sem `error.tsx`, qualquer erro de render vira a página do Next: em inglês,
 * sem explicação e sem saída. Para quem costura, é o mesmo que o sistema ter
 * sumido.
 */
describe('erro de tela não vira página em branco', () => {
  test('o painel e a raiz têm tela de erro própria', () => {
    for (const arquivo of ['src/app/painel/error.tsx', 'src/app/global-error.tsx']) {
      assert.ok(existsSync(arquivo), `falta ${arquivo}`);
      const fonte = readFileSync(arquivo, 'utf8');
      assert.match(fonte, /reset/, `${arquivo} não oferece tentar de novo`);
      assert.match(fonte, /[áéíóúâêôãõç]/i, `${arquivo} não está em português`);
    }
  });

  test('a tela de erro tranquiliza sobre os dados', () => {
    // o medo real de quem vê a tela quebrar é ter perdido os pedidos
    const fonte = readFileSync('src/app/painel/error.tsx', 'utf8');
    assert.match(fonte, /perdid/i, 'não diz que os dados estão a salvo');
  });
});

describe('lista que vem do servidor nunca chega nula na tela', () => {
  test('todo setX de lista em dados.ts usa ?? []', () => {
    const fonte = readFileSync('src/lib/dados.ts', 'utf8');
    const soltos: string[] = [];

    for (const m of fonte.matchAll(/set(Pedidos|Servicos|Despesas|Fixas|Fechamentos)\(([^)]*)\)/g)) {
      const argumento = m[2];
      // atualização por função (setX((a) => ...)) não vem do servidor
      if (argumento.includes('=>')) continue;
      if (!argumento.includes('??')) soltos.push(`set${m[1]}(${argumento})`);
    }

    assert.deepEqual(
      soltos,
      [],
      'resposta sem a lista faz o .filter() estourar no render e a tela sumir:\n' +
        soltos.join('\n')
    );
  });
});

/**
 * O `tudo.sql` é gerado, não escrito.
 *
 * Um arquivo combinado que envelhece é pior que não ter nenhum: quem colar
 * confia que rodou tudo, e a migração nova fica de fora sem aviso.
 */
describe('o arquivo único das migrações acompanha os numerados', () => {
  test('está igual ao que o gerador produz agora', async () => {
    const { montarTudo } = await import('../ferramentas/gerar-tudo-sql.mjs');
    const { conteudo } = montarTudo();
    const noDisco = readFileSync('supabase/tudo.sql', 'utf8');

    assert.equal(
      noDisco,
      conteudo,
      'supabase/tudo.sql está desatualizado — rode `npm run supabase:tudo`'
    );
  });

  test('traz todas as migrações numeradas', () => {
    const tudo = readFileSync('supabase/tudo.sql', 'utf8');
    const numeradas = readdirSync('supabase').filter((n) => /^\d{3}-.*\.sql$/.test(n));

    for (const nome of numeradas) {
      assert.ok(tudo.includes(nome), `${nome} ficou de fora do arquivo único`);
    }
  });

  test('avisa que é gerado, para ninguém editar à mão', () => {
    assert.match(readFileSync('supabase/tudo.sql', 'utf8'), /GERADO A PARTIR/);
  });
});
