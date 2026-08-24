import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { conferirAmbiente, lerChave, refDoProjeto } from '../src/lib/ambiente';

/** Monta uma chave antiga do Supabase (JWT) com o papel e o projeto pedidos. */
function chave(role: string, ref: string): string {
  const parte = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${parte({ alg: 'HS256', typ: 'JWT' })}.${parte({ role, ref, iss: 'supabase' })}.assinatura`;
}

const ANON = chave('anon', 'abcdefg');
const SERVICO = chave('service_role', 'abcdefg');

const COMPLETO = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefg.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON,
  SUPABASE_SERVICE_ROLE_KEY: SERVICO,
  NEXT_PUBLIC_APP_URL: 'https://ateliedarosa.com.br',
  CRON_SECRET: 'a'.repeat(32),
  GOOGLE_CLIENT_ID: 'x',
  GOOGLE_CLIENT_SECRET: 'x',
  GOOGLE_REDIRECT_URI: 'x',
  GOOGLE_CALENDAR_ID: 'x',
  RESEND_API_KEY: 're_abc',
  EMAIL_DESTINO: 'rosa@atelie.com.br',
  EMAIL_REMETENTE: 'painel@atelie.com.br',
};

const achar = (vars: Record<string, string | undefined>, nome: string) =>
  conferirAmbiente(vars).find((c) => c.nome === nome);

describe('ler uma chave do Supabase sem falar com ninguém', () => {
  test('a antiga entrega o papel e o projeto', () => {
    assert.deepEqual(lerChave(ANON), { formato: 'jwt', papel: 'anon', ref: 'abcdefg' });
    assert.deepEqual(lerChave(SERVICO), { formato: 'jwt', papel: 'service_role', ref: 'abcdefg' });
  });

  test('a nova entrega o papel pelo prefixo, e projeto nenhum', () => {
    assert.deepEqual(lerChave('sb_publishable_abc123'), { formato: 'nova', papel: 'anon', ref: null });
    assert.deepEqual(lerChave('sb_secret_abc123'), { formato: 'nova', papel: 'service_role', ref: null });
  });

  test('texto que não é chave não vira chave', () => {
    for (const lixo of ['', '   ', 'cole aqui', 'a.b', 'a.b.c.d', 'a.@@@.c'])
      assert.equal(lerChave(lixo).papel, null, `aceitou ${JSON.stringify(lixo)}`);
  });

  test('o endereço do projeto sai da URL', () => {
    assert.equal(refDoProjeto('https://abcdefg.supabase.co'), 'abcdefg');
    assert.equal(refDoProjeto('https://ABCDEFG.supabase.co/'), 'abcdefg');
    assert.equal(refDoProjeto('http://abcdefg.supabase.co'), null, 'http não é https');
    assert.equal(refDoProjeto('https://supabase.co'), null);
    assert.equal(refDoProjeto(undefined), null);
  });
});

describe('o que o .env.local não pode deixar passar', () => {
  test('arquivo certo passa inteiro', () => {
    assert.deepEqual(
      conferirAmbiente(COMPLETO).filter((c) => c.situacao !== 'ok'),
      [],
      'um arquivo correto não pode reclamar de nada'
    );
  });

  /**
   * O pior erro possível do arquivo: `NEXT_PUBLIC_` vai junto com a página para
   * o navegador. A chave de serviço ali expõe o banco inteiro para quem abrir o
   * formulário do QR — sem erro, sem aviso, funcionando perfeitamente.
   */
  test('chave de serviço no campo público é PERIGO, não aviso', () => {
    const c = achar({ ...COMPLETO, NEXT_PUBLIC_SUPABASE_ANON_KEY: SERVICO }, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
    assert.equal(c?.situacao, 'falta');
    assert.match(c!.recado, /PERIGO/);
    assert.match(c!.recado, /navegador/);
  });

  test('chave pública no campo de serviço não passa', () => {
    const c = achar({ ...COMPLETO, SUPABASE_SERVICE_ROLE_KEY: ANON }, 'SUPABASE_SERVICE_ROLE_KEY');
    assert.equal(c?.situacao, 'falta');
  });

  test('a mesma chave nos dois campos não passa', () => {
    const c = achar({ ...COMPLETO, SUPABASE_SERVICE_ROLE_KEY: ANON, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON }, 'As duas chaves');
    assert.equal(c?.situacao, 'falta');
  });

  /**
   * Misturar projetos foi um erro real deste projeto: o SQL rodou num banco e o
   * painel apontava para outro. O Supabase responde só "Invalid API key", que
   * não diz nada sobre serem projetos diferentes.
   */
  test('chave de um projeto com endereço de outro é apontada pelo nome', () => {
    const c = achar({ ...COMPLETO, SUPABASE_SERVICE_ROLE_KEY: chave('service_role', 'outro123') }, 'SUPABASE_SERVICE_ROLE_KEY');
    assert.equal(c?.situacao, 'falta');
    assert.match(c!.recado, /outro123/);
    assert.match(c!.recado, /abcdefg/);
  });

  test('chave nova não inventa projeto para reclamar', () => {
    const vars = { ...COMPLETO, SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_abc' };
    assert.deepEqual(conferirAmbiente(vars).filter((c) => c.situacao !== 'ok'), []);
  });

  test('variável vazia é falta, não silêncio', () => {
    for (const nome of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'])
      assert.equal(achar({ ...COMPLETO, [nome]: '' }, nome)?.situacao, 'falta', nome);
  });

  test('endereço da própria máquina avisa, mas não impede testar', () => {
    for (const endereco of ['http://localhost:3000', 'http://127.0.0.1:3000'])
      assert.equal(achar({ ...COMPLETO, NEXT_PUBLIC_APP_URL: endereco }, 'NEXT_PUBLIC_APP_URL')?.situacao, 'atencao');
  });

  test('segredo curto do cron avisa e diz o tamanho', () => {
    const c = achar({ ...COMPLETO, CRON_SECRET: 'curto' }, 'CRON_SECRET');
    assert.equal(c?.situacao, 'atencao');
    assert.match(c!.recado, /5 caracteres/);
  });

  /** Google pela metade é pior que Google desligado: falha no meio da conta. */
  test('Google pela metade é falta; Google desligado é só aviso', () => {
    assert.equal(achar({ ...COMPLETO, GOOGLE_CLIENT_SECRET: '' }, 'Google Agenda')?.situacao, 'falta');
    const semNenhum = { ...COMPLETO, GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', GOOGLE_REDIRECT_URI: '', GOOGLE_CALENDAR_ID: '' };
    assert.equal(achar(semNenhum, 'Google Agenda')?.situacao, 'atencao');
  });

  test('arquivo totalmente vazio não quebra e acusa tudo', () => {
    const tudo = conferirAmbiente({});
    assert.ok(tudo.length > 5);
    assert.ok(tudo.some((c) => c.situacao === 'falta'), 'um arquivo vazio tem de acusar falta');
  });

  test('nenhum recado repete o valor de uma chave', () => {
    const vazado = conferirAmbiente(COMPLETO).filter((c) => c.recado.includes(ANON) || c.recado.includes(SERVICO));
    assert.deepEqual(vazado, [], 'a conferência não pode imprimir chave nenhuma');
  });
});

describe('a lista da conferência é legível', () => {
  /**
   * Somando uma linha por problema, a mesma chave saía 'ok' em cima e 'FALTA'
   * embaixo. Quem bate o olho lê a primeira e vai embora achando que está tudo
   * certo — o pior desfecho possível para uma tela de conferência.
   */
  test('cada variável aparece uma vez só, mesmo com dois problemas juntos', () => {
    const confuso = {
      ...COMPLETO,
      SUPABASE_SERVICE_ROLE_KEY: chave('service_role', 'outro123'),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: chave('anon', 'maisoutro'),
    };
    const nomes = conferirAmbiente(confuso).map((c) => c.nome);
    assert.deepEqual(
      nomes.filter((n, i) => nomes.indexOf(n) !== i),
      [],
      'variável repetida na lista'
    );
  });

  test('nenhum recado é vago', () => {
    for (const c of conferirAmbiente({}))
      assert.ok(c.recado.length > 20, `recado curto demais em ${c.nome}: ${c.recado}`);
  });
});

/**
 * Guarda estrutural: acrescentar uma variável ao `.env.example` e esquecer a
 * conferência não dá erro nenhum — a variável simplesmente nunca é conferida, e
 * o defeito só aparece na casa do ateliê. A quebra deste guarda está registrada
 * em ferramentas/auditar-guardas.mjs.
 */
describe('a conferência acompanha o .env.example', () => {
  test('toda variável do exemplo é conferida', () => {
    const exemplo = readFileSync('.env.example', 'utf8');
    const fonte = readFileSync('src/lib/ambiente.ts', 'utf8');

    const nomes = [...exemplo.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]);
    assert.ok(nomes.length >= 8, `só achei ${nomes.length} variáveis no exemplo — a leitura quebrou`);

    const esquecidas = nomes.filter((n) => !fonte.includes(n));
    assert.deepEqual(
      esquecidas,
      [],
      'variáveis no .env.example que ninguém confere:\n' + esquecidas.join('\n')
    );
  });
});

describe('e-mail dos lembretes', () => {
  test('desligado é aviso, e explica que o painel continua avisando', () => {
    const semEmail = { ...COMPLETO, RESEND_API_KEY: '', EMAIL_DESTINO: '', EMAIL_REMETENTE: '' };
    const c = achar(semEmail, 'E-mail dos lembretes');
    assert.equal(c?.situacao, 'atencao');
    assert.match(c!.recado, /painel/);
  });

  test('pela metade é falta e diz o que falta', () => {
    const c = achar({ ...COMPLETO, EMAIL_DESTINO: '' }, 'E-mail dos lembretes');
    assert.equal(c?.situacao, 'falta');
    assert.match(c!.recado, /EMAIL_DESTINO/);
  });

  test('endereço que não é endereço não passa', () => {
    for (const torto of ['rosa', 'rosa@', '@atelie.com.br', 'rosa atelie.com.br'])
      assert.equal(achar({ ...COMPLETO, EMAIL_DESTINO: torto }, 'E-mail dos lembretes')?.situacao, 'falta', torto);
  });

  test('completo e certo passa', () => {
    assert.equal(achar(COMPLETO, 'E-mail dos lembretes')?.situacao, 'ok');
  });
});
