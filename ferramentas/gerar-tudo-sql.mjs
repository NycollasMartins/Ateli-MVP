/**
 * Junta as migrações numeradas num arquivo só, para colar de uma vez.
 *
 * Existe porque rodar sete arquivos à mão é sete chances de pular um — e a
 * migração pulada só aparece como funcionalidade quebrada semanas depois.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PASTA = 'supabase';
const SAIDA = join(PASTA, 'tudo.sql');

const CABECALHO = `-- ============================================================
-- Ateliê · TUDO
--
-- Os arquivos numerados, um atrás do outro, para colar de uma vez só.
--
-- Serve tanto para banco novo quanto para banco em uso: cada pedaço é seguro
-- de rodar de novo. Se preferir ir com calma, rode os numerados um a um — dá
-- no mesmo, e o erro fica mais fácil de localizar.
--
-- GERADO A PARTIR DOS ARQUIVOS NUMERADOS. Não edite este aqui: mexa no
-- numerado e gere de novo com \`npm run supabase:tudo\`.
-- ============================================================

`;

const risco = '─'.repeat(60);

export function montarTudo() {
  const numerados = readdirSync(PASTA)
    .filter((n) => /^\d{3}-.*\.sql$/.test(n))
    .sort();

  const partes = numerados.map(
    (nome) =>
      `-- ${risco}\n-- ${nome}\n-- ${risco}\n\n` +
      readFileSync(join(PASTA, nome), 'utf8').trimEnd() +
      '\n'
  );

  return { conteudo: CABECALHO + partes.join('\n'), numerados };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { conteudo, numerados } = montarTudo();
  writeFileSync(SAIDA, conteudo);
  console.log(`${SAIDA} gerado a partir de: ${numerados.join(', ')}`);
}
