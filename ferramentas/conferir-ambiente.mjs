/**
 * Confere o `.env.local` antes de `npm run dev`.
 *
 * A tela de saúde do painel confere quase as mesmas coisas, mas só abre depois
 * de logar — e logar depende destas variáveis. Quando elas estão erradas, a
 * tela que explicaria o erro é justamente a que não abre.
 *
 * Uso: npm run conferir
 */
import { existsSync, readFileSync } from 'node:fs';
import { conferirAmbiente } from '../src/lib/ambiente.ts';

// aceita um caminho para dar para conferir um arquivo de exemplo sem mexer no seu
const ARQUIVO = process.argv[2] ?? '.env.local';

/** Lê KEY=VALOR, sem depender de biblioteca nenhuma. */
function lerArquivo(caminho) {
  const vars = {};
  for (const linha of readFileSync(caminho, 'utf8').split('\n')) {
    const corte = linha.indexOf('=');
    if (corte < 1 || linha.trimStart().startsWith('#')) continue;
    const nome = linha.slice(0, corte).trim();
    let valor = linha.slice(corte + 1).trim();
    if (/^(".*"|'.*')$/s.test(valor)) valor = valor.slice(1, -1);
    vars[nome] = valor;
  }
  return vars;
}

if (!existsSync(ARQUIVO)) {
  console.log(`\n  Não existe ${ARQUIVO}. Crie a partir do exemplo:\n`);
  console.log('      cp .env.example .env.local\n');
  console.log('  Depois preencha as três primeiras linhas com o que está em');
  console.log('  Supabase → Project Settings → API, e rode este comando de novo.\n');
  process.exit(1);
}

const checagens = conferirAmbiente(lerArquivo(ARQUIVO));
const MARCA = { ok: '  ok    ', atencao: '  ~     ', falta: '  FALTA ' };
const larguraNome = Math.max(...checagens.map((c) => c.nome.length));

console.log('');
for (const { nome, situacao, recado } of checagens) {
  console.log(`${MARCA[situacao]}${nome.padEnd(larguraNome)}  ${recado}`);
}

const faltando = checagens.filter((c) => c.situacao === 'falta').length;
const atencao = checagens.filter((c) => c.situacao === 'atencao').length;

console.log('');
if (faltando) {
  console.log(`  ${faltando} coisa(s) impedem o painel de subir. Arrume e rode de novo.\n`);
  process.exit(1);
}
console.log(
  atencao
    ? `  Dá para rodar. ${atencao} ponto(s) para resolver antes de o ateliê usar de verdade.\n`
    : '  Tudo no lugar. Pode rodar npm run dev.\n'
);
