import 'server-only';
import { MARCA_PADRAO, type Marca } from './marca';

/**
 * O nome, as cores e o logo do ateliê.
 *
 * Vinham da tabela `config`, com uma tela no painel para editá-los. A tela
 * saiu: quem troca a marca agora é quem mexe no código, em `MARCA_PADRAO`
 * (`src/lib/marca.ts`). Ler do banco ficaria como consulta em toda página
 * renderizada para nunca devolver nada diferente.
 */
export async function lerMarca(): Promise<Marca> {
  return MARCA_PADRAO;
}
