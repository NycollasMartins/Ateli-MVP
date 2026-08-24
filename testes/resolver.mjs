/**
 * Os arquivos de src/ importam sem extensão (`from './tipos'`), que é o que o
 * Next resolve. O Node puro exige a extensão. Este gancho completa a extensão
 * na hora de rodar os testes, para não precisar mudar os imports do projeto
 * inteiro por causa deles.
 */
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EXTENSOES = ['.ts', '.tsx', '.mts'];
const JA_TEM_EXTENSAO = /\.[cm]?[tj]sx?$/;

registerHooks({
  resolve(especificador, contexto, seguinte) {
    const relativo = especificador.startsWith('./') || especificador.startsWith('../');

    if (relativo && !JA_TEM_EXTENSAO.test(especificador)) {
      const base = new URL(especificador, contexto.parentURL);
      for (const ext of EXTENSOES) {
        if (existsSync(fileURLToPath(new URL(base.href + ext)))) {
          return seguinte(especificador + ext, contexto);
        }
      }
    }

    return seguinte(especificador, contexto);
  },
});
