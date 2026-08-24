# Banco de dados — o que rodar no Supabase

Estes arquivos são para colar à mão no **SQL Editor** do Supabase, um de cada vez, na ordem do
número. Nenhum deles apaga dados e todos podem ser rodados de novo sem estragar nada — se você
não lembrar o que já rodou, rode tudo outra vez na ordem.

## O caminho curto

Cole o **`tudo.sql`** de uma vez no SQL Editor e rode. Ele é os arquivos numerados um atrás do
outro, e serve tanto para banco novo quanto para banco em uso — cada pedaço é seguro de rodar de
novo, então não faz mal já ter rodado alguns.

Se preferir ir com calma, ou se algo der errado e você quiser saber onde, rode os numerados um a
um como está abaixo. Dá no mesmo.

## Antes de tudo: confira que é o projeto certo

Se você tiver mais de um projeto no Supabase, **olhe o nome no alto da tela antes de colar
qualquer coisa.** Rodar no projeto errado é o erro mais fácil de cometer aqui e o mais difícil de
perceber: o SQL responde *Success*, nada dá errado, e o painel do Ateliê continua vazio para
sempre — porque as tabelas foram criadas noutro lugar.

Na dúvida, rode o `conferir.sql` primeiro. Ele avisa quando o banco tem tabelas de outro sistema
dentro.

## Como rodar

1. Abra o painel do seu projeto em [supabase.com](https://supabase.com).
2. **Confira o nome do projeto no alto da tela.** É o do ateliê?
3. Menu da esquerda → **SQL Editor** → **New query**.
4. Abra o arquivo aqui, copie o conteúdo inteiro, cole e clique em **Run**.
5. Deve aparecer *Success. No rows returned*. Passe para o próximo número.
6. No fim, rode o `conferir.sql` e leia a coluna da direita: só siga quando não houver `FALTA`.

## Os arquivos

| Arquivo | O que faz | Quando rodar |
|---|---|---|
| `001-tabelas.sql` | Cria todas as tabelas e tranca o acesso público a elas | Banco novo |
| `002-tabela-de-precos.sql` | Põe 15 serviços de exemplo, só se a tabela estiver vazia | Banco novo |
| `003-despesas.sql` | Tabela de despesas + coluna de despesa no fechamento de caixa | **Ainda falta rodar no seu banco** |
| `004-usuarios.sql` | Perfis de quem entra no painel, ligados ao Supabase Auth | **Ainda falta rodar no seu banco** |
| `005-marca.sql` | Lugar para guardar o logo do ateliê | **Ainda falta rodar no seu banco** |
| `006-fotos.sql` | Fotos da peça, num balde fechado | **Ainda falta rodar no seu banco** |
| `007-despesas-fixas.sql` | Despesas que se repetem todo mês | **Ainda falta rodar no seu banco** |
| `008-travas.sql` | Impede estado inventado e dinheiro incoerente | **Ainda falta rodar no seu banco** |
| `009-trava-despesa-fixa.sql` | Conserta a trava do 007, que o Postgres não conseguia usar | **Ainda falta rodar no seu banco** |
| `010-papeis-prazo-e-pressa.sql` | Papel de cada pessoa (admin/funcionário), prazo em horas, ramal e o acréscimo da pressa | **Ainda falta rodar no seu banco** |

**Banco novo:** rode 001 a 010, nesta ordem.

**Banco que já está rodando:** rode só o que ainda falta — hoje, do `003` ao `010`. Rodar os
outros de novo também é seguro, mas não muda nada.

O `008` é o único que pode reclamar: ele recusa se já existir pedido com estado fora da lista
ou com sinal maior que o valor. O próprio arquivo traz a consulta para achar essas linhas.

O `010` promove a administrador **todo mundo que já entrava no painel** — é o único jeito de
ninguém ficar trancado para fora do que já usava. Depois de rodá-lo, entre em **Equipe** e
rebaixe para funcionário quem não deve ver o financeiro, a equipe nem o QR.

## Depois do 004: crie a primeira pessoa

A senha única do `.env.local` deixou de existir. Enquanto não houver ninguém cadastrado, o
painel não deixa entrar — e a tela de Equipe, que cria as pessoas, fica atrás do login.

Por isso a primeira pessoa se cria à mão, uma vez só:

1. Menu da esquerda → **Authentication** → **Users** → **Add user** → *Create new user*.
2. E-mail e senha, e marque **Auto Confirm User** (sem isso o login recusa).
3. Entre em `/login`. Daí em diante, use **Painel → Equipe** para o resto da equipe.

## Depois de rodar

Em **Project Settings → API**, copie para o seu `.env.local`:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- chave `anon` / `publishable` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- chave `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

A chave `anon` vai para o navegador de propósito — é ela que faz o login funcionar, e sozinha
não lê nada, porque nenhuma tabela tem política de leitura liberada. A `service_role` é a que
não pode vazar: ela ignora todas as travas e só é usada no servidor. Nenhuma tabela tem política
de leitura liberada: o
navegador nunca fala direto com o banco, sempre passa pelas rotas do `/api`.

## Conferir o que já rodou

Na dúvida sobre o estado do banco, cole o **`conferir.sql`** no SQL Editor. Ele não muda nada:
lista cada tabela, coluna, balde e trava de segurança dizendo *ok* ou qual arquivo falta rodar.
É o primeiro lugar a olhar quando algo não aparece no painel.

Duas linhas dele merecem atenção especial:

- **Balde `pecas`** precisa estar *fechado*. Se aparecer aberto, fotos de clientes estão
  expostas na internet — rode o `006-fotos.sql` de novo.
- **RLS ligada em todas as tabelas.** Se alguma aparecer sem, a chave pública consegue ler
  aqueles dados.

## Manutenção

`manutencao-precos-duplicados.sql` — só se a tabela de preços tiver serviços repetidos. O
arquivo explica por que isso pode ter acontecido e não apaga nada: apenas esconde as cópias,
para não quebrar o histórico de pedidos antigos.

## Se algo der errado

- **"relation already exists"** — pode ignorar, a tabela já estava lá.
- **"permission denied"** — você está no SQL Editor errado; confira se é o projeto certo.
- **"Invalid login credentials"** ao entrar — o usuário existe mas não foi confirmado. Em
  Authentication → Users, abra a pessoa e confirme o e-mail.
- Para conferir o que existe hoje: menu da esquerda → **Table Editor**. Você deve ver
  `servicos`, `pedidos`, `pedido_itens`, `pedido_fotos`, `notificacoes`, `fechamentos`,
  `despesas`, `despesas_fixas`, `perfis` e `config`. Em **Storage** devem existir os baldes
  `marca` (aberto) e
  `pecas` (fechado).

## Ao criar uma migração nova

Crie o próximo número (`010-…sql`), nunca edite um arquivo já rodado — o seu banco não sabe
voltar atrás. Use sempre `create table if not exists`, `add column if not exists` e afins, para
o arquivo continuar seguro de rodar duas vezes. E lembre do `enable row level security` em toda
tabela nova: sem isso ela fica legível pela chave pública.

Se a migração criar tabela ou balde, acrescente a conferência dela em
`src/app/api/admin/saude/route.ts` — senão a tela de Estado da instalação dirá "está tudo no
lugar" com uma parte do banco faltando. Há teste.

Depois de criar, rode `npm run supabase:tudo` para regerar o `tudo.sql`, e acrescente o arquivo
à tabela acima. Há teste que falha se qualquer um dos dois for esquecido — arquivo combinado
desatualizado é pior que nenhum, porque quem cola confia que rodou tudo.
