# Ateliê — painel de pedidos, agenda e caixa

Sistema para ateliê de costura: a cliente lê um QR na parede e preenche o pedido; você marca o
dia da retirada; o evento vai para o Google Agenda com lembrete de 3 dias e de 24 horas; cada
entrega registrada vira faturamento na semana e no mês.

Feito em Next.js 16 (App Router) + TypeScript + Tailwind + Supabase. Pensado como MVP para
revender: trocar nome, cores e tabela de preços é tudo que muda de cliente para cliente.

---

## 1. Instalar

```bash
npm install
cp .env.example .env.local
```

## 2. Banco de dados (Supabase)

1. Crie um projeto em supabase.com (o plano gratuito dá conta).
2. Abra **SQL Editor**, cole o `supabase/tudo.sql` e rode — é tudo de uma vez, e serve também
   para banco que já está em uso. Preferindo ir com calma, rode os numerados um a um.
   O passo a passo está em [`supabase/LEIA-ME.md`](supabase/LEIA-ME.md). Todos podem ser rodados
   de novo sem duplicar nada, então na dúvida rode tudo.
3. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

Se faltar alguma dessas três, a tela de login diz **qual** e **onde achá-la**, e o botão de
entrar fica desligado — em vez de acusar a sua senha de errada.

A chave `service_role` só é usada no servidor. Nenhuma tabela tem política de leitura pública:
o navegador nunca fala direto com o banco.

## 3. Quem entra no painel

Cada pessoa tem o próprio e-mail e a própria senha, guardados pelo Supabase Auth, e um **papel**:

| Papel | O que vê |
|---|---|
| **Administrador** | Tudo: visão geral, pedidos, clientes, agenda, financeiro, tabela de preços, QR e equipe |
| **Funcionário** | Visão geral, pedidos, clientes, agenda e tabela de preços |

O funcionário não abre o **financeiro**, a **equipe** nem o **QR** — e não é só o menu que esconde:
o `src/proxy.ts` barra o endereço digitado à mão e cada rota de `/api/admin` confere o papel por
conta própria.

O papel mora no `app_metadata` do Supabase, não no `user_metadata`. A diferença é a segurança do
painel inteiro: a pessoa logada consegue escrever no próprio `user_metadata` e se promoveria a
administrador sozinha, do navegador dela.

**A primeira pessoa você cria à mão**, porque ainda não há ninguém logado para convidá-la:

1. No Supabase, menu da esquerda → **Authentication** → **Users** → **Add user** →
   *Create new user*.
2. Preencha e-mail e senha, e marque **Auto Confirm User**.
3. Rode o `supabase/010-papeis-prazo-e-pressa.sql`, que promove a administrador quem já existe.
4. Entre em `/login` com esse e-mail e essa senha.

Daí em diante é tudo pelo painel: **Equipe** → *Convidar alguém*. Chega um e-mail com um link
onde a pessoa escolhe a própria senha; ninguém do ateliê chega a ver a senha de ninguém. Na
mesma tela dá para trocar o papel de quem já entra, mandar link de senha nova para quem esqueceu
e tirar o acesso de alguém.

### Para o convite chegar: SMTP no Supabase

O convite usa o envio do próprio Supabase. **No plano gratuito ele limita a poucos e-mails por
hora** — dá para testar, não para usar de verdade. Antes de abrir para a equipe, configure um
SMTP próprio em **Authentication → Emails → SMTP Settings**.

E em **Authentication → URL Configuration**, acrescente o endereço da tela de senha à lista de
*Redirect URLs*:

```
https://SEU-DOMINIO/definir-senha
```

Sem isso o link do e-mail leva para fora e a pessoa não consegue definir a senha.

## 4. Google Agenda

Nada disso passa por arquivo: as credenciais entram pelo painel e ficam no banco.

1. console.cloud.google.com → novo projeto.
2. **APIs e serviços → Biblioteca** → ative **Google Calendar API**.
3. **Tela de permissão OAuth**: tipo Externo, adicione seu e-mail em "usuários de teste".
4. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**.
5. No painel, **Agenda → Preencher credenciais**. A tela mostra o endereço de retorno exato para
   você copiar e cadastrar no Google Cloud — é o que precisa bater letra por letra.
6. Cole o ID e a chave secreta, salve e clique em **Conectar Google Agenda**.

Na mesma tela ficam **Desconectar** (solta a conta e para de criar eventos), **Trocar de conta**
(conecta outra conta Google) e **Esquecer as credenciais**. Só administrador mexe nelas; o
funcionário vê a agenda e o aviso de conectada ou não.

A chave secreta nunca volta do servidor para o navegador — a tela sabe apenas se ela existe. As
variáveis `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` continuam funcionando como reserva, para
quem já tinha configurado assim.

## 5. Testes

```bash
npm test
```

Cobrem as regras de negócio que não podem quebrar: semana de segunda a domingo, data de retirada
sem pulo de fuso, dinheiro em centavos, sinal que nunca passa do valor, cliente reconhecida por
telefone em qualquer formato, concordância das mensagens de WhatsApp, o CSV que abre no Excel e
as datas das despesas que se repetem.

Não usam biblioteca nenhuma: é o `node --test` que já vem no Node.

Antes de publicar, rode os quatro:

```bash
npm run lint && npm test && npm run typecheck && npm run build
```

O que os testes **não** cobrem, e por isso continua sendo teste na tela: tudo que fala com o
Supabase, com o Google Agenda ou com o navegador.

### Provar que os testes acusam

Parte dos testes é **guarda estrutural**: varre o código-fonte procurando o que não pode existir
(emoji na interface, rota de admin sem checar a sessão, gráfico sem os números em texto). Guarda
tem um defeito próprio: quando erra, erra absolvendo — passa verde para sempre e ninguém percebe.
Três desta base nasceram assim.

Por isso existe:

```bash
npm run auditar
```

Ele quebra o código de propósito, um problema por vez, e confere se **o guarda certo acusou, pelo
nome**. Só conta como provado se o trecho a quebrar existia, o arquivo mudou e o teste que falhou
foi o esperado. Demora alguns minutos e devolve o código ao estado original no fim.

Ao escrever um guarda novo, acrescente a quebra dele em `ferramentas/auditar-guardas.mjs`. Um
guarda sem entrada lá é uma promessa que ninguém conferiu.

## 6. Rodar

Antes de subir pela primeira vez, confira o `.env.local`:

```bash
npm run conferir
```

Ele lê o arquivo e diz, linha por linha, o que está no lugar e o que impede o painel de subir.
Não fala com o Supabase e **não imprime chave nenhuma** — só o formato delas. Pega o que a tela
de saúde não teria como pegar, porque ela só abre depois de logar, e logar depende justamente
destas variáveis.

Os três erros que ele existe para achar, todos silenciosos:

- a chave de serviço colada no campo `NEXT_PUBLIC_` — aí ela vai para o navegador junto com a
  página, e quem abrir o formulário do QR lê o banco inteiro;
- chave de um projeto com o endereço de outro — o Supabase responde só *Invalid API key*, que não
  diz nada sobre serem projetos diferentes;
- integração preenchida pela metade, que falha no meio em vez de ficar desligada.

```bash
npm run dev
```

- Painel: http://localhost:3000/painel
- Formulário da cliente: http://localhost:3000/f
- Tabela de preços pública: http://localhost:3000/f/precos

Para ver como fica publicado, sem contêiner:

```bash
npm run build && npm start
```

O `npm start` sobe o mesmo servidor empacotado que roda dentro da imagem — não o `next dev`.
Assim, o que você testa aqui é o que vai para o ar.

## 7. Publicar

O projeto sai em contêiner (`Dockerfile`) ou direto na Vercel. Os dois precisam das mesmas
variáveis do `.env.local`, com `NEXT_PUBLIC_APP_URL` e `GOOGLE_REDIRECT_URI` trocadas para o
domínio real.

### O que precisa estar no build, e não só na execução

**Tudo que começa com `NEXT_PUBLIC_` é gravado dentro do JavaScript que vai para o navegador, na
hora do build.** Definir essas variáveis só como variável de execução não muda nada: vale o valor
que estava lá quando a imagem foi construída.

A que morde é a `NEXT_PUBLIC_APP_URL`, porque é o endereço que o cartaz do QR leva impresso.
Construir a imagem sem ela imprime um cartaz apontando para `localhost` — e isso só aparece
quando a primeira cliente tenta ler o código na parede. Por isso o `Dockerfile` recebe as três
como `ARG`:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="chave-anon" \
  --build-arg NEXT_PUBLIC_APP_URL="https://SEU-DOMINIO" \
  -t atelie .
```

No Easypanel, esses três vão no campo de **build arguments** da aplicação. As demais
(`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, as do Google e as do e-mail) são de execução e vão
no campo de variáveis de ambiente normal — a `service_role` **não** pode ir como build arg.

A imagem escuta na porta `3000`, roda como usuário sem privilégio e traz um healthcheck que
pergunta pelo `/login`.

### Netlify (para a cliente experimentar)

O Netlify reconhece Next.js sozinho: conecte o repositório e ele monta. Diferente do contêiner,
aqui as variáveis do build e as de execução são as mesmas — basta cadastrá-las uma vez em
**Site configuration → Environment variables**, as `NEXT_PUBLIC_` incluídas.

O `next.config.mjs` desliga o `output: 'standalone'` quando detecta que quem está montando é o
Netlify, porque lá o adaptador monta o site do jeito dele. Não há nada para ligar.

Um detalhe de ordem: a `NEXT_PUBLIC_APP_URL` precisa do endereço do site, que só existe depois do
primeiro deploy. Publique uma vez, copie o endereço, preencha a variável e mande publicar de
novo. Enquanto isso não for feito, o cartaz do QR aponta para o lugar errado.

Depois do primeiro deploy, três endereços passam a precisar do domínio novo:

- Supabase → **Authentication → URL Configuration → Redirect URLs**: `https://SEU-SITE/definir-senha`
- Google Cloud → o endereço de retorno que a tela da Agenda mostra
- a tarefa que chama os lembretes (abaixo)

### Os lembretes precisam de alguém que chame

O `vercel.json` agenda `/api/cron/lembretes` todo dia às 8h de Brasília (11h UTC). **Fora da
Vercel esse arquivo não faz nada** — e a falha é silenciosa: o painel continua funcionando e os
lembretes de 72h e 24h simplesmente nunca rodam.

No Easypanel, crie uma tarefa agendada (`0 11 * * *`) chamando a rota. De fora do contêiner:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://SEU-DOMINIO/api/cron/lembretes
```

De dentro dele, sem depender de `curl` estar instalado:

```bash
node -e "fetch('http://127.0.0.1:3000/api/cron/lembretes',{headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>r.text()).then(console.log)"
```

A resposta diz o que foi feito: `lembretes` traz o que saiu e `falharam`, o que não saiu e vai
ser tentado de novo na próxima chamada.

**O `CRON_SECRET` é obrigatório.** Sem ele preenchido, a rota recusa todo mundo — inclusive a
tarefa agendada. É de propósito: é o único endereço do sistema que roda sem login, e um estranho
disparando-o faria os lembretes serem marcados como enviados sem que você recebesse nada. A
Vercel manda esse segredo sozinha quando a variável está configurada lá; no Easypanel, é você
quem põe o cabeçalho, como nos comandos acima.

Para testar na mão, em desenvolvimento:

```bash
npm run dev
curl -H "Authorization: Bearer SEU_CRON_SECRET" http://localhost:3000/api/cron/lembretes
```

Qualquer outra coisa recebe 401: cabeçalho da Vercel enviado à mão não vale, e segredo em branco
fecha a porta em vez de abri-la.

## 8. Imprimir o QR

Painel → **QR do ateliê** → **Imprimir cartaz**. O código aponta para `NEXT_PUBLIC_APP_URL/f` e
não muda nunca: imprima uma vez e esqueça. Se trocar de domínio, reimprima.

**Confira o endereço antes de imprimir.** Se a variável ainda estiver com o valor de exemplo
(`http://localhost:3000`), a tela avisa em vermelho: o cartaz sairia apontando para um endereço
que só funciona no seu computador, e nenhuma cliente conseguiria abrir. O painel não dá outro
sinal disso, porque a variável vence sobre o endereço real do site.

---

## Como o dinheiro é contado

- O valor do pedido nasce da soma dos serviços marcados no formulário, **sempre lido do banco**
  (o preço que o navegador manda é ignorado).
- Você pode corrigir o valor à mão antes de marcar a retirada. Tanto faz escrever `70,00` ou
  `70.00`: os dois valem setenta reais.
- **Sinal**: se a cliente deixa uma entrada, escreva o valor no campo *Sinal deixado*, ao lado do
  valor a cobrar. O painel passa a mostrar quanto falta receber na retirada — na lista de
  pedidos, nas próximas retiradas, no evento do Google e no lembrete. O sinal não pode passar do
  valor a cobrar.
- Faturamento só entra quando você aperta **Registrar entrega e pagamento**, e entra pelo valor
  cheio do pedido, sinal incluído: o dia da entrega é o dia em que o pedido conta no caixa.
  Antes disso o que aparece em "a receber" é o valor menos o sinal.
- **Despesas** ficam no próprio Financeiro: dia, no que gastou, categoria e valor. Elas não
  precisam estar ligadas a nenhum pedido — aluguel e conta de luz também entram.
- **Despesas que se repetem** (aluguel, luz, internet) você cadastra uma vez, com o dia do mês.
  Elas entram sozinhas quando o dia chega e viram despesas comuns: dá para corrigir o valor de
  um mês específico ou apagar sem mexer no resto. Quem escolhe dia 31 recebe no último dia do
  mês, inclusive em fevereiro. *Pausar* para de lançar sem perder o cadastro; o que já foi
  lançado fica onde está, porque mexeria no lucro de meses já fechados.
- O lançamento acontece quando você abre o Financeiro, não numa tarefa agendada — assim funciona
  igual em quem nunca configurou cron. A data do lançamento é sempre a do dia certo, não a do
  dia em que você abriu a tela.
- **Lucro = receita − despesa**, no período que estiver escolhido no alto da tela (semana ou
  mês). O gráfico das 8 semanas mostra as duas barras, e o número em cima de cada semana é o
  lucro dela.
- As setas **‹ ›** no alto do Financeiro andam para trás pelas semanas ou pelos meses. Serve
  para conferir uma semana que já passou e, principalmente, para baixar o CSV do **mês fechado**,
  que é o que se manda para o contador. Não dá para andar para o futuro.
- **Baixar CSV** dá o extrato do período que estiver na tela: entregas como entrada, despesas
  como saída, em ordem de data. O **sinal não aparece como linha separada**: o pedido entra pelo
  valor cheio no dia da entrega, que é a regra do caixa aqui. Se o contador perguntar onde foi
  parar a entrada, é isso. Abre direto no Excel e no Google Planilhas, com acento e vírgula
  decimal
  certos, e a coluna de valor soma.
- A semana vai de segunda a domingo. O botão de fechar o caixa **diz as datas da semana que vai
  fechar**, para não haver dúvida. Se você não fechou no domingo, aparece um segundo botão para
  fechar a semana passada — fechar o caixa costuma ser coisa de segunda de manhã, e antes disso
  a semana encerrada ficava sem registro.
- O fechamento guarda um retrato da receita e da despesa para o histórico; o número da tela
  continua sendo calculado ao vivo.

## Avisar a cliente no WhatsApp

O sistema **não manda mensagem sozinho**, de propósito: nada de conta comercial na Meta, nada de
custo por mensagem, nada de risco de bloquear o número. O que ele faz é não deixar você esquecer
e escrever o texto por você.

- Na **Visão geral**, o cartaz "Falta avisar no WhatsApp" lista quem está esperando notícia:
  quem ainda não sabe a data, quem retira amanhã, quem já tem a peça pronta na bancada e **quem
  passou do dia e não apareceu**. Esta última é a mais importante e some sozinha da vista se o
  sistema não a cobrar: a cliente não voltou, e a peça ocupa a bancada.
- Um toque abre o WhatsApp com a mensagem escrita — com o dia, a hora e quanto falta pagar. Você
  lê, muda o que quiser e manda.
- Assim que você abre, a linha some da lista. Se **a data ou a hora** da retirada mudar, ela
  volta: a cliente precisa saber da mudança. Salvar só uma anotação não faz a lista cobrar de
  novo.
- O mesmo botão aparece dentro do pedido, junto com o texto que vai ser enviado.

O nome que aparece na mensagem vem de `NEXT_PUBLIC_ATELIE_NOME`.

## Histórico da cliente

**Painel → Clientes** junta os pedidos por telefone. A mesma pessoa que digitou
`(11) 98765-4321` numa visita, `5511987654321` na outra e `011 98765-4321` na terceira aparece
uma vez só.

Cada ficha mostra desde quando ela é cliente, quanto já gastou, quanto gasta por peça em média,
o que costuma trazer e a lista inteira de pedidos — clicando em qualquer um você cai no pedido.

Dentro de um pedido aberto, o selo **"3ª vez"** aparece ao lado do nome quando é uma cliente que
volta, com as peças anteriores logo abaixo do contato. Pedido cancelado entra na ficha, mas não
conta como visita: ela não chegou a trazer a peça.

## Fotos da peça

- **A cliente** pode anexar até 3 fotos no formulário do QR. A foto encolhe assim que ela
  escolhe, então a espera acontece enquanto ela ainda preenche o resto — e a câmera boa do
  celular, que produz arquivos de 6 a 8 MB, deixa de ser recusada. É opcional, e só vale para o pedido
  que ela acabou de fazer: a janela fecha em 30 minutos, depois disso ela manda pelo WhatsApp.
- **Você** fotografa na bancada pelo painel, abrindo o pedido. Até 8 fotos por pedido, 5 MB
  cada, em JPG, PNG ou WEBP.
- **A foto encolhe antes de subir**, no próprio navegador: 1600 pixels no lado maior, que mostra
  a costura e o tecido com folga. Uma foto de celular sai de 3–6 MB para uns 300 KB. Em 4G fraco
  isso muda um envio de dois minutos e meio para poucos segundos, e faz o balde gratuito de 1 GB
  render mais de mil pedidos em vez de cinquenta. Se o navegador não der conta, a original sobe
  do mesmo jeito.
- As fotos ficam num balde **fechado** do Supabase Storage. Elas não têm endereço público: o
  painel gera um link assinado que vence em uma hora, cada vez que você abre o pedido.
- Apagar o pedido apaga as fotos junto, do banco e do balde.

## Trocar a marca

Nome, cores e logo ficam em `MARCA_PADRAO`, no arquivo [`src/lib/marca.ts`](src/lib/marca.ts).
Havia uma tela para editá-los no painel; ela saiu, porque a marca deste ateliê não muda no dia a
dia — quem troca é quem mexe no código.

- **Nome**: aparece no menu, na aba do navegador, no formulário da cliente, no cartaz do QR e
  nas mensagens de WhatsApp.
- **Cores**: quatro. *Base* (menu e botões), *Fita* (dinheiro e datas), *Giz* (links) e
  *Alinhavo* (provisório e o que apaga). As variações claras e escuras de cada uma saem sozinhas
  da cor escolhida. Papel, grade e cor do texto não mudam: são o que segura a legibilidade.
- **Logo**: `logo_url` aponta para uma imagem; `null` deixa só o nome escrito.

Ao desenhar algo novo, use as classes (`bg-mata`, `fill-fita`) e nunca um hex solto, senão
aquele pedaço não acompanha a marca.

## Buscar

A busca de **Pedidos** e de **Clientes** ignora acento e formato de telefone. Digitar
`conceicao` acha "Maria da Conceição", e `11987654321` acha quem foi salvo como
`(11) 98765-4321` — o número copiado do WhatsApp encontra o pedido.

Em Pedidos ela procura no nome, no código, na peça e na descrição; em Clientes, no nome e nas
peças que a pessoa costuma trazer.

## Peça atrasada

O cartaz **Retiradas atrasadas e dos próximos 3 dias**, na Visão geral, traz a contagem de
atrasadas em vermelho no canto e é o lugar onde uma peça que passou do dia aparece — a fita
métrica só mostra de hoje em diante. O atraso vem escrito
por extenso e em vermelho ("atrasada 7 dias"), para não se perder no meio das próximas.

## Estados de um pedido

`novo` (chegou pelo QR, sem data — aparece com borda alinhavada) → `agendado` (retirada marcada,
evento criado no Google) → `pronto` (peça terminada, opcional) → `entregue` (pago, entra no
caixa).
`cancelado` apaga o evento da agenda. Cancelar pede confirmação e diz o que vai acontecer —
inclusive quanto sai do caixa, se o pedido já estava entregue.

## Estrutura

```
src/app/f/              formulário e tabela de preços que a cliente vê
src/app/definir-senha/  onde quem foi convidado escolhe a própria senha
src/app/painel/         visão geral, pedidos, clientes, agenda, financeiro e ajustes
src/app/api/publico/    rotas abertas (formulário e tabela)
src/app/api/admin/      rotas protegidas por cookie; parte delas, só por administrador
src/app/api/google/     OAuth do Calendar
src/app/api/cron/       lembretes de 72h e 24h
src/lib/                banco, Google, formatação, hooks
src/lib/acesso.ts       quem pode abrir o quê — a mesma lista que o proxy usa
src/components/         interface
testes/                 as regras de negócio, em node --test
supabase/00*.sql        o banco, em arquivos numerados para rodar na ordem
```

## Conferir a instalação

```bash
npm run conferir
```

Lê o `.env.local` e diz, linha por linha, o que está no lugar e o que falta — sem imprimir chave
nenhuma. Para olhar o banco por dentro, rode o `supabase/conferir.sql` no SQL Editor do Supabase.

Havia também uma tela **Estado da instalação** no painel. Ela saiu: é ferramenta de quem instala,
não de quem usa o ateliê todo dia.

## Segurança

- **Nada é lido do banco pelo navegador.** Todas as tabelas têm RLS ligada e nenhuma política de
  leitura. O navegador só fala com as rotas do `/api`, e cada rota de `/api/admin` confere a
  sessão por conta própria — não confia só no `src/proxy.ts`.
- **Sem sessão, o painel barra em vez de quebrar.** Se o Supabase não responder ou faltar
  variável de ambiente, cai no login; rota de API devolve `{ erro }` em JSON, nunca uma página
  de erro onde o painel espera dados.
- **O otimizador de imagens do Next está desligado** (`images.unoptimized`). Este projeto não usa
  `next/image`: as imagens vêm do Supabase Storage. Desligar fecha a rota `/_next/image` e, com
  ela, a superfície do `sharp`/libvips.
- **A chave `service_role` não consegue chegar ao navegador.** Todo módulo que fala com o banco
  é marcado como exclusivo de servidor; se alguém o importar numa tela, o build falha em vez de
  publicar a chave. Essa chave ignora todas as travas do banco, então é a única que não pode
  vazar de jeito nenhum — inclusive para dentro do repositório, e o `.gitignore` cobre todas as
  variantes de `.env` que o Next usa.
- **As fotos das peças ficam num balde fechado**, servidas por link assinado que vence em uma
  hora. Só o logo do ateliê fica num balde aberto.
- **Papel não se escolhe do navegador.** Ele mora no `app_metadata` do Supabase Auth, que só a
  chave de serviço escreve. No `user_metadata` — que a própria pessoa consegue alterar — um
  funcionário se promoveria a administrador sozinho. Esconder o item do menu é cortesia: quem
  barra é o `src/proxy.ts` e cada rota de `/api/admin`, por conta própria.
- **Ninguém vê a senha de ninguém.** O convite e a troca de senha vão por e-mail, e a pessoa
  escolhe a própria. Antes saía uma senha temporária na tela para a administradora ditar, o que
  a deixava anotada num papel e ouvida por quem estivesse por perto.
- **A chave secreta do Google não volta para o navegador.** A tela da Agenda pergunta apenas se
  ela existe.

Ao atualizar dependências, rode `npm audit`. Hoje ele acusa **zero vulnerabilidades**.

## Decisões que valem saber

- **Sem realtime do Supabase.** A lista se atualiza sozinha a cada 12 segundos e sempre que você
  volta para a aba. Com a aba escondida ela para de buscar, para não gastar dados móveis do
  celular que fica na bancada. Realtime no navegador exigiria abrir a leitura das tabelas para o
  cliente
  anônimo — dados de clientes não ficam expostos por causa de 12 segundos.
- **Duas pessoas no mesmo pedido.** Se alguém salvar enquanto você escreve, o painel avisa e
  mantém o que você digitou — não apaga. Quem salvar por último grava por cima, então combinem
  antes de mexer no mesmo pedido ao mesmo tempo.
- **Login pelo Supabase Auth**, uma pessoa por e-mail. Um ateliê por instalação: os dados não
  são separados por cliente dentro do mesmo banco. Para vender assinatura sem instalar nada por
  cliente, seria preciso um `atelie_id` em todas as tabelas e políticas de RLS por ateliê.
- **Serviço "escondido" em vez de apagado**, para não quebrar o histórico dos pedidos antigos.
- **Peça com pressa cobra sozinha.** Ao marcar "preciso com pressa", o formulário pergunta se
  quem pede é ministro, ministra ou advogado: se for, a prioridade sai sem custo; se não,
  a pessoa vê o acréscimo de R$ 10,00 escrito e decide antes de aceitar. Quem marca e fecha a
  pergunta sem responder paga o acréscimo — do contrário, fechar a janela seria o jeito mais
  fácil de furar a fila.

## Desenho

Base de corte verde com grade na navegação, papel de molde na área de trabalho, fita métrica
amarela como elemento de leitura de tempo e de dinheiro. Borda alinhavada (tracejada vermelha) =
ainda provisório. Números sempre em fonte monoespaçada, para as colunas baterem.

Tipografia: Bricolage Grotesque (títulos), Archivo (texto), Azeret Mono (números).

As cores são variáveis CSS (`--cor-mata`, `--cor-fita`, `--cor-giz`, `--cor-linha`), com o
padrão em `globals.css` e a troca por ateliê vindo do banco. O `tailwind.config.ts` só aponta
para elas. Ao desenhar algo novo, use as classes (`bg-mata`, `fill-fita`) e nunca um hex solto,
senão aquele pedaço não acompanha a marca do cliente.
