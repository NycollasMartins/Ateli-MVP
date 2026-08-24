'use client';

import { useState } from 'react';
import type { Pedido } from '@/lib/tipos';
import { enviar } from '@/lib/dados';
import { jaAvisada, linkAviso, textoParaCliente, type TipoAviso } from '@/lib/mensagens';
import { useAviso } from './Avisos';
import { useMarca } from './Marca';

/**
 * Abre o WhatsApp com a mensagem já escrita e anota que a cliente foi avisada.
 * A mensagem não sai sozinha: a costureira lê, ajusta se quiser e manda.
 */
export function BotaoWhats({
  pedido,
  tipo,
  rotulo,
  aoAvisar,
  className = '',
  mostrarTexto = false,
}: {
  pedido: Pedido;
  tipo: TipoAviso;
  rotulo: string;
  aoAvisar?: () => void;
  className?: string;
  mostrarTexto?: boolean;
}) {
  const avisar = useAviso();
  const { nome: nomeAtelie } = useMarca();
  const [feito, setFeito] = useState(false);
  const marcado = feito || jaAvisada(pedido, tipo);

  async function abrir() {
    window.open(linkAviso(pedido, tipo, nomeAtelie), '_blank', 'noopener');
    setFeito(true);
    try {
      await enviar(`/api/admin/pedidos/${pedido.id}/avisada`, 'POST', { tipo });
      aoAvisar?.();
    } catch {
      // o WhatsApp já abriu; não valia estragar a ação por causa da anotação
      avisar('Mensagem aberta, mas não consegui anotar aqui que você avisou.', 'erro');
    }
  }

  return (
    <div className={className}>
      <button
        onClick={abrir}
        className={`btn w-full ${marcado ? 'btn-secundario' : 'btn-principal'}`}
      >
        <Icone />
        {marcado ? 'Avisar de novo' : rotulo}
      </button>
      {mostrarTexto && (
        <p className="mt-2 border-l-2 border-grade pl-3 text-xs leading-relaxed text-tinta-suave">
          {textoParaCliente(pedido, tipo, nomeAtelie)}
        </p>
      )}
    </div>
  );
}

function Icone() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M2.5 13.5 3.4 10a5.8 5.8 0 1 1 2.2 2.1z" strokeLinejoin="round" />
    </svg>
  );
}
