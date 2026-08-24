/** Vinha da tela de Estado da instalação, que saiu; o tipo ficou onde é usado. */
export type Situacao = 'ok' | 'atencao' | 'falta';

/**
 * Confere o `.env.local` antes de o painel subir.
 *
 * A tela de saúde já confere quase tudo isto, mas só abre depois de logar — e
 * logar depende justamente destas variáveis. Quando elas estão erradas, a tela
 * que explicaria o erro é a que não abre. Por isso esta conferência roda no
 * terminal, sem banco e sem navegador.
 *
 * Nada aqui imprime o valor de uma chave: só o formato dela.
 */

export type Conferencia = { nome: string; situacao: Situacao; recado: string };

/** `https://abcdefg.supabase.co` → `abcdefg` */
export function refDoProjeto(url: string | undefined): string | null {
  const limpo = (url ?? '').trim();
  if (!limpo) return null;
  const m = /^https:\/\/([a-z0-9]+)\.supabase\.(co|in)\b/i.exec(limpo);
  return m ? m[1].toLowerCase() : null;
}

export type Chave = {
  formato: 'jwt' | 'nova' | 'vazia' | 'estranha';
  papel: 'anon' | 'service_role' | null;
  ref: string | null;
};

function base64url(pedaco: string): string | null {
  try {
    const b64 = pedaco.replace(/-/g, '+').replace(/_/g, '/');
    return atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  } catch {
    return null;
  }
}

/**
 * Lê o que dá para ler de uma chave do Supabase sem falar com ninguém.
 *
 * As antigas são JWT e carregam o papel e o projeto por dentro — é isso que
 * permite avisar que a chave é de outro projeto. As novas (`sb_publishable_`,
 * `sb_secret_`) não carregam nada, e aí dá para conferir só o prefixo.
 */
export function lerChave(valor: string | undefined): Chave {
  const bruto = (valor ?? '').trim();
  if (!bruto) return { formato: 'vazia', papel: null, ref: null };

  if (bruto.startsWith('sb_publishable_')) return { formato: 'nova', papel: 'anon', ref: null };
  if (bruto.startsWith('sb_secret_')) return { formato: 'nova', papel: 'service_role', ref: null };

  const partes = bruto.split('.');
  if (partes.length !== 3) return { formato: 'estranha', papel: null, ref: null };

  const texto = base64url(partes[1]);
  if (!texto) return { formato: 'estranha', papel: null, ref: null };

  let corpo: { role?: unknown; ref?: unknown };
  try {
    corpo = JSON.parse(texto);
  } catch {
    return { formato: 'estranha', papel: null, ref: null };
  }

  const papel = corpo.role === 'anon' || corpo.role === 'service_role' ? corpo.role : null;
  const ref = typeof corpo.ref === 'string' ? corpo.ref.toLowerCase() : null;
  return { formato: 'jwt', papel, ref };
}

const presente = (v: string | undefined) => (v ?? '').trim().length > 0;

export function conferirAmbiente(vars: Record<string, string | undefined>): Conferencia[] {
  const lista: Conferencia[] = [];
  const diz = (nome: string, situacao: Situacao, recado: string) =>
    lista.push({ nome, situacao, recado });

  // ---------- Endereço do projeto ----------
  const url = vars.NEXT_PUBLIC_SUPABASE_URL;
  const ref = refDoProjeto(url);
  if (!presente(url)) {
    diz('NEXT_PUBLIC_SUPABASE_URL', 'falta', 'Está vazia. Supabase → Project Settings → API → Project URL.');
  } else if (!ref) {
    diz('NEXT_PUBLIC_SUPABASE_URL', 'falta', 'Não parece um endereço do Supabase. O certo é https://algo.supabase.co');
  } else {
    diz('NEXT_PUBLIC_SUPABASE_URL', 'ok', `Projeto ${ref}.`);
  }

  // ---------- As duas chaves ----------
  const anon = lerChave(vars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const servico = lerChave(vars.SUPABASE_SERVICE_ROLE_KEY);

  // Cada variável dá uma linha só. Somando uma linha por problema, a mesma
  // chave saía 'ok' em cima e 'FALTA' embaixo — e quem bate o olho vê o 'ok'.
  const avaliarChave = (
    nome: string,
    valor: string | undefined,
    chave: Chave,
    esperado: 'anon' | 'service_role',
    trocada: string,
    ondeAchar: string
  ): Conferencia => {
    if (chave.papel && chave.papel !== esperado)
      return { nome, situacao: 'falta', recado: trocada };
    if (!presente(valor)) return { nome, situacao: 'falta', recado: `Está vazia. ${ondeAchar}` };
    if (chave.formato === 'estranha')
      return { nome, situacao: 'falta', recado: 'Não parece uma chave do Supabase. Copie de novo, inteira.' };
    // Chave de um projeto com endereço de outro responde só "Invalid API key",
    // que não diz nada sobre serem projetos diferentes.
    if (ref && chave.ref && chave.ref !== ref)
      return {
        nome,
        situacao: 'falta',
        recado: `É do projeto ${chave.ref}, mas o endereço aponta para ${ref}. Chaves e endereço têm de ser do mesmo projeto.`,
      };
    return {
      nome,
      situacao: 'ok',
      recado: esperado === 'anon' ? 'É a chave pública.' : 'É a chave de serviço, e ela não vai para o navegador.',
    };
  };

  // Trocar as duas de lugar é o erro mais caro do arquivo inteiro: a chave de
  // serviço num campo `NEXT_PUBLIC_` vai junto com a página para o navegador,
  // e quem abrir o formulário do QR passa a ler o banco todo.
  lista.push(
    avaliarChave(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      vars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anon,
      'anon',
      'PERIGO: aqui está a chave de serviço. Tudo que começa com NEXT_PUBLIC_ vai para o navegador — ' +
        'qualquer pessoa que abrir o formulário lê o banco inteiro. Troque a chave e gere outra no Supabase.',
      'É a chave `anon public`, em Project Settings → API.'
    )
  );

  lista.push(
    avaliarChave(
      'SUPABASE_SERVICE_ROLE_KEY',
      vars.SUPABASE_SERVICE_ROLE_KEY,
      servico,
      'service_role',
      'Aqui está a chave pública. O painel não vai conseguir gravar nada. Use a `service_role`.',
      'É a chave `service_role`, na mesma tela — a secreta.'
    )
  );

  if (
    presente(vars.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    vars.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() === vars.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    diz('As duas chaves', 'falta', 'São a mesma chave. Uma delas está no campo errado.');
  }

  // ---------- Endereço do próprio painel ----------
  const app = (vars.NEXT_PUBLIC_APP_URL ?? '').trim();
  if (!app) {
    diz('NEXT_PUBLIC_APP_URL', 'atencao', 'Vazia. É o endereço que vai impresso no cartaz do QR.');
  } else if (/localhost|127\.0\.0\.1/.test(app)) {
    diz('NEXT_PUBLIC_APP_URL', 'atencao', 'Aponta para a sua máquina. Serve para testar; troque antes de imprimir o QR.');
  } else {
    diz('NEXT_PUBLIC_APP_URL', 'ok', app);
  }

  // ---------- Lembretes ----------
  const segredo = (vars.CRON_SECRET ?? '').trim();
  if (!segredo) {
    diz('CRON_SECRET', 'atencao', 'Vazia. Sem ela os lembretes diários não rodam — de propósito, para ninguém disparar de fora.');
  } else if (segredo.length < 16) {
    diz('CRON_SECRET', 'atencao', `Tem ${segredo.length} caracteres. Use 32 ou mais: é uma senha que fica na internet.`);
  } else {
    diz('CRON_SECRET', 'ok', 'Guardada.');
  }

  // ---------- Opcionais, mas inteiros ----------
  // Meio preenchido é pior que vazio: o painel tenta, falha no meio e a dona
  // fica sem saber se o problema é dela.
  // As credenciais do Google agora entram pelo painel, em Agenda -> Preencher
  // credenciais, e ficam no banco. Estas variáveis viraram reserva: vazias não
  // são problema nenhum, mas meio preenchidas continuam sendo, porque vencem
  // sobre o que está guardado.
  const google = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
  const temGoogle = google.filter((n) => presente(vars[n]));
  if (temGoogle.length === 0) {
    diz('Google Agenda', 'ok', 'As credenciais entram pelo painel, em Agenda.');
  } else if (temGoogle.length < google.length) {
    diz(
      'Google Agenda',
      'falta',
      `Meio preenchida vence sobre o painel e falha no meio. Complete ou apague: ${google
        .filter((n) => !presente(vars[n]))
        .join(', ')}.`
    );
  } else {
    diz('Google Agenda', 'ok', 'Credenciais no arquivo, valendo sobre as do painel.');
  }

  // continuam no exemplo e são conferidas aqui, mesmo sem regra própria:
  // GOOGLE_REDIRECT_URI e GOOGLE_CALENDAR_ID têm padrão quando vazias

  const email = ['RESEND_API_KEY', 'EMAIL_DESTINO', 'EMAIL_REMETENTE'];
  const temEmail = email.filter((n) => presente(vars[n]));
  if (temEmail.length === 0) {
    diz('E-mail dos lembretes', 'atencao', 'Desligado. Os lembretes continuam aparecendo no painel, só não chegam por e-mail.');
  } else if (temEmail.length < email.length) {
    diz('E-mail dos lembretes', 'falta', `Falta preencher: ${email.filter((n) => !presente(vars[n])).join(', ')}.`);
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((vars.EMAIL_DESTINO ?? '').trim())) {
    diz('E-mail dos lembretes', 'falta', 'EMAIL_DESTINO não parece um endereço de e-mail.');
  } else {
    diz('E-mail dos lembretes', 'ok', `Os lembretes vão para ${vars.EMAIL_DESTINO?.trim()}.`);
  }

  return lista;
}
