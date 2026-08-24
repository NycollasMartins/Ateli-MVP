import 'server-only';
import { cache } from 'react';
import { lerConfig, gravarConfig } from './supabase';
import { CHAVE_MARCA, CORES_PADRAO, MARCA_PADRAO, normalizarHex, type Marca } from './marca';

// ---------------------------------------------------------------- leitura

/** Sempre devolve uma marca completa, mesmo com a tabela `config` vazia. */
export const lerMarca = cache(async (): Promise<Marca> => {
  const salva = await lerConfig<Partial<Marca>>(CHAVE_MARCA);
  const nome = String(salva?.nome ?? '').trim();

  return {
    nome: nome || MARCA_PADRAO.nome,
    logo_url: salva?.logo_url ?? null,
    cores: {
      mata: normalizarHex(salva?.cores?.mata ?? '', CORES_PADRAO.mata),
      fita: normalizarHex(salva?.cores?.fita ?? '', CORES_PADRAO.fita),
      giz: normalizarHex(salva?.cores?.giz ?? '', CORES_PADRAO.giz),
      linha: normalizarHex(salva?.cores?.linha ?? '', CORES_PADRAO.linha),
    },
  };
});

export async function gravarMarca(marca: Marca) {
  await gravarConfig(CHAVE_MARCA, marca);
}
