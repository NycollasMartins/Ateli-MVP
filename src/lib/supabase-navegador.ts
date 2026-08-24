'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * O único lugar do sistema em que o navegador fala direto com o Supabase.
 *
 * Existe para uma coisa só: a tela onde quem foi convidado escolhe a própria
 * senha. O link do e-mail traz a prova de identidade na própria URL, e é o
 * cliente do navegador que a lê e a troca por uma sessão — o servidor não tem
 * como fazer isso por ela.
 *
 * Segue valendo que nenhuma tabela é lida daqui: a chave é a pública, e
 * nenhuma tabela tem política de leitura. Todo o resto do painel continua
 * passando pelas rotas do `/api`.
 */
export const supabaseDoNavegador = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  );
