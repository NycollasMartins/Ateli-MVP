/**
 * Confere se os guardas realmente acusam.
 *
 * Escrever um guarda, rodar e ver verde não prova nada: três desta base
 * nasceram absolvendo todo mundo em silêncio. E o próprio teste de injeção
 * engana quando a injeção não pega no arquivo — foi assim que uma auditoria
 * anterior deu dois falsos "não pegou" que eram culpa do script, não do guarda.
 *
 * Por isso aqui cada passo é verificado:
 *   1. o trecho a quebrar existe mesmo no arquivo;
 *   2. o arquivo mudou depois da troca;
 *   3. o teste que falhou é o esperado, pelo nome.
 *
 * Uso: node ferramentas/auditar-guardas.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const QUEBRAS = [
  {
    guarda: 'nenhuma tela usa emoji',
    arquivo: 'src/components/ui.tsx',
    de: 'export function Linha',
    para: 'export function Linha /* ⚡ */',
  },
  {
    guarda: 'todo setX de lista em dados.ts usa ?? []',
    arquivo: 'src/lib/dados.ts',
    de: 'setPedidos(lista ?? [])',
    para: 'setPedidos(lista)',
  },
  {
    guarda: 'ninguém usa toISOString() para extrair o dia',
    arquivo: 'src/lib/formato.ts',
    de: "export const isoDia = (d: Date) => format(d, 'yyyy-MM-dd');",
    para: 'export const isoDia = (d: Date) => d.toISOString().slice(0, 10);',
  },
  {
    guarda: 'nenhum useMemo/useState de dependência vazia guarda a data',
    arquivo: 'src/components/FitaMetrica.tsx',
    de: '  const grade = useMemo',
    para: '  const congelado = useMemo(() => new Date(), []);\n  const grade = useMemo',
  },
  {
    guarda: 'todo método de /api/admin revalida a sessão',
    arquivo: 'src/app/api/admin/fechamentos/route.ts',
    de: 'export async function GET() {\n  if (!(await estaLogado())) return naoAutorizado();',
    para: 'export async function GET() {',
  },
  {
    guarda: 'não existe catch de corpo vazio no código',
    arquivo: 'src/app/painel/agenda/page.tsx',
    de: '.catch(() => setErroConexao(true));',
    para: '.catch(() => {});',
  },
  {
    guarda: 'nenhum input, select ou textarea fica sem nome',
    arquivo: 'src/app/painel/precos/page.tsx',
    de: 'aria-label="Nome do serviço novo"',
    para: '',
  },
  {
    guarda: 'todo btn-perigo chama uma função que confirma',
    arquivo: 'src/components/PainelPedido.tsx',
    // tem de apagar a pergunta inteira: trocar por `if (false && window.confirm(`
    // deixa a palavra no corpo, e o guarda é textual — foi assim que uma
    // auditoria anterior acusou o guarda de frouxo quando a injeção é que era
    de: 'if (!window.confirm(',
    para: 'if (false) { void 0;',
  },
  {
    guarda: 'todo gráfico tem os mesmos números em texto',
    arquivo: 'src/components/FitaMetrica.tsx',
    de: 'className="sr-only"',
    para: 'className="hidden"',
  },
  {
    guarda: 'quem mostra o botão de avisar usa avisoSugerido()',
    arquivo: 'src/components/PainelPedido.tsx',
    de: "import { avisoSugerido } from '@/lib/avisos';",
    para: '',
  },
  {
    guarda: 'quem tem campo de busca usa casaComBusca()',
    arquivo: 'src/app/painel/pedidos/page.tsx',
    de: "import { casaComBusca } from '@/lib/busca';",
    para: '',
  },
  {
    guarda: 'nenhum eslint-disable de exhaustive-deps no código',
    arquivo: 'src/lib/dados.ts',
    de: 'export function useServicos',
    para: '// eslint-disable-next-line react-hooks/exhaustive-deps\nexport function useServicos',
  },
  {
    guarda: 'toda variável do exemplo é conferida',
    arquivo: '.env.example',
    de: 'CRON_SECRET=',
    para: 'VARIAVEL_NOVA_QUE_NINGUEM_CONFERE="x"\nCRON_SECRET=',
  },
  {
    guarda: 'mudança de fora avisa em vez de sobrescrever',
    arquivo: 'src/components/PainelPedido.tsx',
    de: 'setMudouPorFora(true);',
    para: '/* removido */',
  },
  {
    guarda: 'quem não volta é esquecido, em vez de ficar guardado para sempre',
    arquivo: 'src/lib/limite.ts',
    de: '  esquecerAntigos(janela, corte);',
    para: '  /* removido */',
  },
  {
    guarda: 'o que não é endereço vira vazio, e o pedido segue',
    arquivo: 'src/lib/entrada.ts',
    de: "return /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(limpo) ? limpo : '';",
    para: 'return limpo;',
  },
];

function falhas() {
  try {
    execSync('npm test', { stdio: 'pipe' });
    return [];
  } catch (e) {
    const saida = String(e.stdout ?? '') + String(e.stderr ?? '');
    return [...saida.matchAll(/^\s+✖ (.+?) \(\d/gm)].map((m) => m[1].trim());
  }
}

let reprovados = 0;

for (const { guarda, arquivo, de, para } of QUEBRAS) {
  const original = readFileSync(arquivo, 'utf8');

  if (!original.includes(de)) {
    console.log(`  ✗ ${guarda}\n      o trecho a quebrar não existe mais em ${arquivo}`);
    reprovados++;
    continue;
  }

  writeFileSync(arquivo, original.replace(de, para));
  const acusaram = falhas();
  writeFileSync(arquivo, original);

  if (acusaram.includes(guarda)) {
    const outros = acusaram.length - 1;
    console.log(`  ok ${guarda}${outros ? `  (+${outros} outro${outros > 1 ? 's' : ''})` : '  — sozinho'}`);
  } else {
    console.log(
      `  ✗ ${guarda}\n      quebrei ${arquivo} e este guarda não acusou.` +
        (acusaram.length ? ` Acusaram: ${acusaram.join('; ')}` : ' Nenhum teste falhou.')
    );
    reprovados++;
  }
}

console.log(
  reprovados
    ? `\n  ${reprovados} guarda(s) sem prova. Um guarda que não acusa é pior que nenhum.`
    : `\n  ${QUEBRAS.length} guardas provados.`
);
process.exit(reprovados ? 1 : 0);
