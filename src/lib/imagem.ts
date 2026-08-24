/**
 * Encolhe a foto antes de enviar.
 *
 * Uma foto de celular tem de 3 a 6 MB. Três delas, em 4G fraco, levam dois
 * minutos e meio para subir — com a cliente esperando em pé. E o balde gratuito
 * de 1 GB comporta cerca de 56 pedidos nesse tamanho.
 *
 * Mil e seiscentos pixels no lado maior mostram a costura, o tecido e o defeito
 * com folga: é foto para conferir peça, não para ampliar em parede.
 */
export const LADO_MAXIMO = 1600;
export const QUALIDADE = 0.82;

/** Abaixo disso não vale reprocessar: já está pequena. */
export const JA_PEQUENA = 400 * 1024;

/** O tamanho de destino, mantendo a proporção e nunca aumentando a imagem. */
export function calcularTamanho(largura: number, altura: number, maximo = LADO_MAXIMO) {
  const maior = Math.max(largura, altura);
  if (maior <= maximo || maior === 0) return { largura, altura };

  const fator = maximo / maior;
  return {
    largura: Math.max(1, Math.round(largura * fator)),
    altura: Math.max(1, Math.round(altura * fator)),
  };
}

const REPROCESSAVEIS = ['image/jpeg', 'image/png', 'image/webp'];

export const valeEncolher = (arquivo: { type: string; size: number }) =>
  REPROCESSAVEIS.includes(arquivo.type) && arquivo.size > JA_PEQUENA;

/** Troca a extensão do nome, mantendo o resto. */
export const comExtensao = (nome: string, extensao: string) =>
  `${nome.replace(/\.[^./\\]+$/, '')}.${extensao}`;

/**
 * Devolve a foto reduzida, ou a original se não der para reduzir.
 *
 * Nunca lança e nunca devolve algo maior que entrou: se qualquer passo falhar,
 * ou se a redução não compensar, o envio segue com o arquivo de sempre.
 */
export async function reduzirFoto(arquivo: File): Promise<File> {
  if (!valeEncolher(arquivo)) return arquivo;

  try {
    const imagem = await createImageBitmap(arquivo);
    const { largura, altura } = calcularTamanho(imagem.width, imagem.height);

    const tela = document.createElement('canvas');
    tela.width = largura;
    tela.height = altura;

    const pincel = tela.getContext('2d');
    if (!pincel) return arquivo;

    // fundo branco: PNG com transparência viraria preto ao virar JPEG
    pincel.fillStyle = '#FFFFFF';
    pincel.fillRect(0, 0, largura, altura);
    pincel.drawImage(imagem, 0, 0, largura, altura);
    imagem.close?.();

    const menor = await new Promise<Blob | null>((resolve) =>
      tela.toBlob(resolve, 'image/jpeg', QUALIDADE)
    );

    if (!menor || menor.size >= arquivo.size) return arquivo;

    return new File([menor], comExtensao(arquivo.name, 'jpg'), {
      type: 'image/jpeg',
      lastModified: arquivo.lastModified,
    });
  } catch {
    // navegador antigo, imagem corrompida, memória curta: manda a original
    return arquivo;
  }
}
