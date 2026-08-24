'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { Cabecalho } from '@/components/Cabecalho';
import { Cartao, Rotulo } from '@/components/ui';
import { useAviso } from '@/components/Avisos';
import { useMarca, Logo } from '@/components/Marca';
import { ehEnderecoDeTeste } from '@/lib/endereco';


export default function CodigoQR() {
  const marca = useMarca();
  const [base, setBase] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const avisar = useAviso();

  useEffect(() => {
    setBase(process.env.NEXT_PUBLIC_APP_URL || window.location.origin);
  }, []);

  const link = `${base}/f`;

  // O cartaz vai impresso para a parede: endereço errado aqui é papel jogado
  // fora e cliente que não consegue deixar a peça.
  const enderecoDeTeste = ehEnderecoDeTeste(base);

  function baixar() {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return avisar('A imagem ainda está sendo montada. Tente de novo em um instante.', 'erro');
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'qr-atelie.png';
    a.click();
    avisar('Imagem do QR baixada.');
  }

  async function copiarLink() {
    try {
      // clipboard não existe fora de https, e sem isto o clique não dizia nada
      if (!navigator.clipboard) throw new Error('Este navegador não deixa copiar daqui.');
      await navigator.clipboard.writeText(link);
      avisar('Link copiado.');
    } catch (e) {
      avisar((e as Error).message, 'erro');
    }
  }

  return (
    <>
      <Cabecalho
        titulo="QR do ateliê"
        apoio="Este código nunca muda. Imprima uma vez e deixe na parede."
        acoes={
          <>
            <button onClick={() => window.print()} className="btn btn-principal">
              Imprimir cartaz
            </button>
            <button onClick={baixar} className="btn btn-secundario">
              Baixar imagem
            </button>
            <button
              onClick={copiarLink}
              className="btn btn-secundario"
            >
              Copiar link
            </button>
          </>
        }
      />

      {enderecoDeTeste && (
        <div className="sem-impressao mx-5 mt-6 border-l-2 border-linha bg-linha-clara px-4 py-3 md:mx-8">
          <p className="text-sm text-linha">
            Este código aponta para <span className="num">{base}</span>, que só funciona neste
            computador. Impresso assim, nenhuma cliente consegue abrir.
          </p>
          <p className="mt-2 text-xs text-tinta-suave">
            Corrija a variável <span className="num">NEXT_PUBLIC_APP_URL</span> para o endereço de
            verdade do site — no <span className="num">.env.local</span> e também nas variáveis do
            serviço onde ele está publicado. Depois recarregue esta página antes de imprimir.
          </p>
        </div>
      )}

      <div className="grid gap-6 px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* cartaz que sai na impressão */}
        <div className="mx-auto w-full max-w-[420px] border border-dashed border-tinta/30 bg-papel p-8 text-center print:mx-auto print:border-0">
          <Logo className="mx-auto mb-4 h-14 w-auto" />
          <p className="rotulo">Deixe sua peça</p>
          <h2 className="mt-2 font-display text-3xl leading-none tracking-tight">{marca.nome}</h2>
          <div className="my-6 flex justify-center">
            {base && (
              <div className="border-4 border-mata bg-white p-4">
                {/* cor-fixa: QR precisa de contraste máximo para o celular ler.
                    Cor de marca clara aqui deixaria o cartaz inútil. */}
                <QRCodeSVG value={link} size={220} level="M" fgColor="#14201B" bgColor="#FFFFFF" />
              </div>
            )}
          </div>
          <p className="text-[15px] font-medium leading-snug">
            Aponte a câmera do celular e preencha o pedido
          </p>
          <p className="mt-2 text-sm leading-relaxed text-tinta-suave">
            Você escolhe o serviço, vê o preço da tabela e recebe o dia da retirada no WhatsApp.
          </p>
          <div className="mx-auto my-5 h-px w-24 border-t border-dashed border-tinta/30" />
          <p className="num text-[11px] text-tinta-suave">{link.replace(/^https?:\/\//, '')}</p>
        </div>

        <div className="space-y-4 sem-impressao">
          <Cartao className="p-5">
            <Rotulo>Como usar</Rotulo>
            <ol className="mt-3 space-y-3 text-sm leading-relaxed text-tinta">
              <li>
                <strong>1.</strong> Imprima o cartaz e cole na parede, no balcão ou na porta do provador.
              </li>
              <li>
                <strong>2.</strong> A cliente aponta a câmera e preenche o pedido ali mesmo.
              </li>
              <li>
                <strong>3.</strong> O pedido aparece na sua Visão geral com a borda alinhavada, esperando data.
              </li>
              <li>
                <strong>4.</strong> Você marca o dia da retirada e o evento vai para o Google Agenda.
              </li>
            </ol>
          </Cartao>

          <Cartao className="p-5">
            <Rotulo>O endereço do QR</Rotulo>
            <p className="num mt-2 break-all text-sm">{link}</p>
            <p className="mt-3 text-xs leading-relaxed text-tinta-suave">
              O código aponta sempre para este endereço. Enquanto ele não mudar, o cartaz impresso continua
              valendo — mesmo se você trocar a tabela de preços ou os textos do formulário. Ao publicar o
              sistema no seu domínio, ajuste <span className="num">NEXT_PUBLIC_APP_URL</span> e imprima o
              cartaz de novo.
            </p>
          </Cartao>

          <div ref={canvasRef} className="hidden">
            {/* cor-fixa: mesmo motivo — este é o arquivo que vai para a gráfica. */}
            {base && <QRCodeCanvas value={link} size={1024} level="M" fgColor="#14201B" bgColor="#FFFFFF" />}
          </div>
        </div>
      </div>
    </>
  );
}
