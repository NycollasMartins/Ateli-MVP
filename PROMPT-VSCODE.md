# Prompt para colar no Claude dentro do VS Code

Copie tudo o que está entre as linhas abaixo na primeira mensagem. Depois é só pedir a tarefa
que você quer.

---

Você vai trabalhar num projeto Next.js 15 (App Router) + TypeScript + Tailwind + Supabase
chamado **Ateliê**: um painel para um ateliê de costura com formulário público por QR code,
agenda ligada ao Google Calendar, lembretes de retirada e controle de caixa semanal. Ele é um
MVP que será revendido para outros ateliês, então clareza e facilidade de trocar marca/preço
importam mais que sofisticação técnica.

**Antes de mudar qualquer coisa, leia `README.md` e rode `npm run typecheck`.**

## Arquitetura

- `src/app/f/` — o que a cliente vê ao ler o QR: formulário de pedido e tabela de preços. Rotas
  abertas, sem login. O botão de enviar mora na fita do rodapé, **fora** do `<form>`: ele precisa
  de `type="submit" form="pedido"`, senão o navegador não checa os campos obrigatórios e ela só
  descobre o que faltou depois da viagem ao servidor. E `submeter()` trava contra reentrada — o
  Enter num campo dispara o envio, e botão desabilitado não segura isso.
- `src/app/painel/` — a área da costureira: visão geral, pedidos, agenda, financeiro, tabela de
  preços, QR, equipe, clientes, marca. O menu tem dois grupos: o dia a dia, que é o que cabe na
  barra do celular, e `AJUSTES` (em `Navegacao.tsx`), que no celular mora atrás de
  `/painel/ajustes`. Ao criar tela nova, escolha o grupo — não estique a barra de baixo.
  Protegida por `src/proxy.ts` (era `middleware.ts` até o Next 15), que renova a sessão e
  barra quem não está logado. Um ateliê por instalação: não há `atelie_id` nem separação de
  dados por cliente dentro do mesmo banco.
- `src/app/api/publico/*` — rotas abertas. **Nunca confie no que o navegador manda**: o preço é
  recalculado a partir da tabela `servicos`, todo campo de texto passa por `texto()` com o teto
  de `src/lib/entrada.ts`, e a peça é conferida contra `PECAS`. Campo aberto sem teto vira nome
  de cem mil letras no banco e em toda a interface.
- `src/app/api/admin/*` — rotas protegidas; **cada método** revalida com `estaLogado()` ou
  `usuarioAtual()`. Não confie só no `proxy.ts`: um erro no `matcher` deixaria tudo aberto de uma
  vez. Há teste que varre as rotas e falha se algum método esquecer.
- `supabase/` guarda migrações numeradas (`001-…`, `002-…`), rodadas à mão no SQL Editor. Toda
  nova mudança de banco é um arquivo novo com o próximo número, idempotente (`if not exists`) e
  com `enable row level security` se criar tabela. Nunca edite um arquivo já rodado.
  **Acrescente o arquivo à tabela do `supabase/LEIA-ME.md`**: é a lista que a pessoa segue para
  publicar, e o que não estiver lá não roda. Três testes em `testes/estrutura.test.mts` conferem
  isso: numeração sem buraco, arquivo listado no LEIA-ME, e RLS em toda tabela criada.
- `src/app/api/google/*` — OAuth do Google Calendar. Tokens ficam na tabela `config`, chave
  `google_tokens`.
- `src/app/api/cron/lembretes` — roda 1×/dia, cria os lembretes de 72h e 24h sem repetir
  (tabela `notificacoes`, unique por pedido+tipo). **É a única rota sem login**: exige
  `CRON_SECRET` preenchido e compara em tempo constante. Não aceite o cabeçalho `x-vercel-cron`
  como prova — ele não é removido de requisição externa.
- `src/lib/marca.ts` é puro (tipos e cálculo de cor) porque o navegador o importa;
  `src/lib/marca-servidor.ts` é quem lê e grava no banco. Não junte os dois: `marca-servidor`
  arrasta o cliente service role junto.
- `src/lib/configuracao.ts` — diz o que falta no `.env.local`. A tela de login mostra a lista e
  desliga o botão. Ao acrescentar variável obrigatória nova, some nessa lista: senão quem
  publicar sem ela vai ver "senha errada" com a senha certa.
- `src/lib/auth.ts` — sessão do Supabase Auth (`usuarioAtual`, `estaLogado`). Rotas de admin
  sempre revalidam por aqui, nunca confiam só no middleware.
- `src/lib/supabase.ts` — cliente **service role**. Ele e todo módulo que fala com o banco
  começam com `import 'server-only'`: se alguém os importar num componente de navegador, o
  **build falha** em vez de empacotar a chave que ignora todas as travas do banco. Por isso os
  pares `x.ts` (puro) e `x-servidor.ts` (banco) — `marca`, `fotos`, `lembretes`,
  `despesas-fixas`. Cálculo que o navegador usa, ou que dá para testar, mora no arquivo puro.
- Os testes rodam com `--conditions=react-server`, que é o que faz o `server-only` não
  reclamar: o processo de teste é ambiente de servidor mesmo.
- `src/lib/extrato.ts` — as linhas do CSV. Ordem estável (dia, entrada antes de saída, nome):
  baixar o mesmo período duas vezes tem que dar o mesmo arquivo, byte a byte, senão quem compara
  dois extratos vê diferença onde não houve nenhuma.
- `src/lib/busca.ts` — a busca de toda tela. Tira acento e compara telefone só por dígitos.
  Filtro escrito à mão na tela diverge: era o caso de Pedidos, onde o número copiado do WhatsApp
  não achava o pedido salvo com pontuação.
- `src/lib/financeiro.ts` — receita, despesa, lucro, ticket e variação de um período. Toda conta
  de dinheiro passa por aqui; dentro da tela ela fica sem teste. A data de despesa é cortada em
  dez caracteres antes de comparar: se o banco devolver a coluna `date` com hora colada, a
  despesa do último dia do mês sai do período em silêncio.
- `src/lib/resumo.ts` — o que a Visão geral mostra. Recebe o dia em vez de olhar o relógio, para
  dar para testar a virada da semana. Ao mexer nos números daquela tela, mexa aqui: dentro do
  componente eles voltam a ficar sem teste.
- `src/lib/dados.ts` — hooks de navegador (`usePedidos`, `useServicos`, `useFechamentos`) que
  falam com `/api/*` por polling de 12s. O polling **para com a aba escondida** e não empilha
  buscas: sem isso, um painel esquecido aberto num celular baixa a lista inteira o dia todo.

  **Limite conhecido:** `usePedidos` baixa *todos* os pedidos a cada busca, com itens e ids de
  fotos junto. A ~1000 pedidos isso é ~1,2 MB por busca. Aguenta o primeiro ano de um ateliê,
  mas não escala. Quando incomodar, o caminho é separar as consultas por tela — a lista precisa
  dos pedidos abertos, o financeiro de um período, e só a tela de Clientes precisa do histórico
  inteiro — e carregar `pedido_itens` sob demanda, como as fotos já fazem. Não há Supabase
  Realtime no cliente, de propósito: RLS
  está fechada e nenhuma tabela é legível anonimamente.

## Regras de negócio que não podem quebrar

1. Prazo na tela sai de `prazoEmPalavras()`, nunca de `em ${dias} dias` escrito à mão: dias
   negativos existem (peça que passou do dia) e a tela dizia "em -7 dias".
2. Fluxo do pedido: `novo` → `agendado` → (`pronto`) → `entregue`; `cancelado` apaga o evento
   do Google. Esses cinco são a lista inteira, conferida por `ehStatus()` na rota e por
   `check` no banco (`008-travas.sql`). Estado inventado some de todos os filtros da tela.
3. Faturamento só conta pedido com `status = 'entregue'` e `entregue_em` preenchido. Nada de
   contar pedido agendado como receita. **Use `contaComoReceita()`** de `src/lib/tipos.ts`: essa
   conta escrita solta em duas telas é como elas passam a mostrar totais diferentes.
4. Semana comercial = segunda a domingo (`inicioSemana`/`fimSemana` em `src/lib/formato.ts`,
   `weekStartsOn: 1`). Não use `startOfWeek` direto do date-fns em lugar nenhum — teste confere,
   e confere também se o embrulho continua declarando `weekStartsOn: 1`.
5. **"Hoje" nunca é guardado.** Nada de `useMemo(() => new Date(), [])`: painel esquecido aberto
   — tablet na parede, aba que nunca fecha — vira a noite mostrando o dia errado, e nada avisa.
   Calcule dentro do memo que depende dos dados, para acompanhar cada atualização. Há teste.
   No servidor, "hoje" é `hojeNoAtelie()`, não `isoDia(new Date())`: a Vercel roda em UTC e
   viraria o dia às 21h de Brasília. Datas de retirada são `date` puro (`yyyy-MM-dd`). Converta
   sempre com `dataLocal()` /
   `isoDia()`; nunca use `new Date(iso)` nem `.toISOString().slice(0,10)`, que erram o dia por
   causa do fuso de Brasília. `testes/datas-seguras.test.mts` varre o código atrás disso. Ele
   mira só a forma perigosa (`new Date(p.retirada_em)`); `new Date(ano, mes, dia)` é o construtor
   numérico e é seguro, e `timestamptz` (`criado_em`, `entregue_em`) também, porque traz o fuso.
6. Dinheiro é sempre `integer` em centavos no banco e nas props. Formate só na tela, com
   `moeda()`, e **leia com `paraCentavos()` de `src/lib/dinheiro.ts`** — nunca com um
   `replace` improvisado. A regra é: o último separador manda, e ele só é decimal se vier com
   uma ou duas casas. Apagar todos os pontos parece certo (`1.234,56`) e transforma `70.00` em
   R$ 7.000,00, no campo que decide quanto a cliente paga.
7. Sinal nunca passa do valor a cobrar, e não é receita: entra só descontando o "a receber". Na
   entrega, o caixa da semana recebe o valor cheio do pedido.
8. Cliente é identificada por telefone normalizado (`chaveTelefone` em `src/lib/clientes.ts`):
   sem pontuação, sem o 55 do país e **sem o 0 que se põe antes do DDD** — muita gente anota o
   número assim, e sem tirar esse 0 a mesma pessoa vira duas clientes. Pedido cancelado aparece
   no histórico, mas não conta como visita.
9. Foto de peça é dado de cliente: balde `pecas` **fechado**, sempre com URL assinada na hora.
   Nunca guarde a URL no banco nem torne o balde público. A rota aberta de foto só aceita pedido
   `novo` criado nos últimos 30 minutos.

   Antes de subir, a foto passa por `reduzirFoto()` de `src/lib/imagem.ts`, que **nunca lança**:
   se o navegador não redesenhar, sobe a original. Sem encolher, o balde gratuito acaba em cerca
   de cinquenta pedidos e o envio em 4G fraco leva minutos.
10. WhatsApp é sempre **manual por decisão**: o painel escreve o texto e abre o `wa.me`, mas quem
    manda é a costureira. Não plugue provedor de envio sem combinar antes. Os avisos já dados
    ficam em `notificacoes` (`whats_marcada`, `whats_vespera`, `whats_pronta`,
    `whats_atrasada`). Quem decide o que sugerir é `pendenciasDeAviso()` em `src/lib/avisos.ts`:
    a notícia mais recente vence a mais antiga, e **peça que passou do dia nunca sai da lista**.
11. Despesa fixa gera despesa comum, uma por mês, travada pelo índice único
    `(despesa_fixa_id, competencia)`. O lançamento é preguiçoso (roda no GET de
    `/api/admin/despesas`) e tem que continuar podendo rodar quantas vezes for, sem duplicar.
    **O índice não pode ser parcial**: o Postgres só aceita índice parcial como alvo de
    `on conflict` se a consulta repetir o `where`, e a biblioteca do Supabase manda só os nomes
    das colunas. E **sempre confira o `error` do upsert** — engolir ali faz a tela prometer
    "entra sozinha" enquanto nada entra, para sempre.
12. Despesa é solta, não pertence a pedido nenhum, e usa `data` (`date` puro) — filtre comparando
    texto `yyyy-MM-dd`, nunca `Date`. Lucro = receita − despesa; receita continua sendo só pedido
    entregue.
13. Ao mudar data ou valor de um pedido agendado, o evento do Google precisa ser ressincronizado
    (`sincronizarEvento`) e os lembretes liberados de novo. Isso vale para **as duas** rotas que
    escrevem `retirada_em`: `agendar` e o `PATCH`. Use `mudouARetirada()` de
    `src/lib/lembretes.ts` — limpar sempre faz o painel cobrar de novo um WhatsApp já dado, e
    não limpar faz a cliente aparecer no dia antigo.
14. Se o Google Calendar falhar, a operação no banco **não** pode ser desfeita: salve e devolva
    um `aviso` no JSON.

## Convenções de código

- Código, nomes de variáveis, rotas e textos de interface em **português do Brasil**.
- **Edição não salva não pode sumir sozinha.** Vale também contra a atualização automática: o
  painel troca o pedido aberto quando ele muda no banco, e com dois usuários (ou duas abas) isso
  apaga o que a outra pessoa está digitando. `PainelPedido` guarda se o formulário foi tocado e
  avisa em vez de sobrescrever. Rascunho de tela (a tabela de preços tem um)
  descarta só o que deixou de existir, nunca tudo de uma vez: apagar correções de preço sem
  aviso faz a costureira sair achando que reajustou a tabela.
- **Nunca silencie `react-hooks/exhaustive-deps`.** Um `useMemo` de lista incompleta congela o
  valor no dia em que a tela ganha um estado novo — foi assim que o rótulo do maior gasto passou
  a mostrar o período anterior depois que a navegação chegou, com o `eslint-disable` escondendo
  o aviso. Se a conta é barata, tire-a do hook; se não, declare tudo. Há teste.
- **Ação sem volta pergunta antes.** Todo botão `btn-perigo` chama uma função que confirma, e a
  pergunta diz a consequência concreta ("isso tira R$ 120,00 do caixa"), não um "tem certeza?".
  Cancelar pedido era a única ação destrutiva do painel sem confirmação — e é a que apaga o
  evento do Google e mexe em semana talvez já fechada. Há teste.
- **Erro de tela não pode virar página em branco.** `src/app/painel/error.tsx` e
  `src/app/global-error.tsx` são a rede: explicam em português, dizem que os dados estão a
  salvo e oferecem tentar de novo. Toda lista vinda do servidor entra com `?? []`, senão um
  `.filter()` sobre nulo derruba a tela inteira.
- **Falha tem que aparecer.** Lista vazia e calada faz a cliente achar que o ateliê não faz
  nada, e faz a costureira confiar em dado velho. Todo carregamento distingue três estados:
  carregando, deu erro, e veio vazio de verdade — cada um com o seu texto. Nada de
  `catch(() => {})` engolindo erro de tela — nem em `fetch` cru, nem em hook, nem em `.ts`. Dois
  testes varrem o código: um proíbe `catch` de corpo vazio em qualquer arquivo, outro exige
  `try/catch` com `avisar(..., 'erro')` em toda função de tela que chama `enviar()`.

  Vale também para `fetch` cru **sem catch nenhum**: a Marca ficava em
  "Carregando…" para sempre, e o cron abortava os lembretes dos outros pedidos por uma falha de
  rede. Exceção legítima é função que lança de propósito (`pegar`, `enviar`), para quem chama
  tratar.

  Hook que carrega lista devolve `erro` junto (`useServicos`, `useDespesasFixas`,
  `useFechamentos`, `usePedidos` já fazem), e a tela distingue *deu erro* de *veio vazio*.
- Mensagens para a usuária: frase curta, voz ativa, sem jargão técnico e sem pedir desculpas.
  "Retirada marcada para quinta" em vez de "Operação realizada com sucesso".
- Componentes de interface ficam em `src/components`; nada de biblioteca de componentes nova.
- **Gráfico precisa dos mesmos números em texto** (`<ul className="sr-only">`, como a
  `FitaMetrica` e o gráfico das 8 semanas já fazem). `role="img"` com rótulo só diz que existe um
  gráfico; sem a lista, quem usa leitor de tela fica sem o dado.
- **Janela que abre por cima** (painel do pedido, ficha da cliente, foto ampliada) usa
  `useJanelaModal()` de `src/lib/janela.ts`, mais `role="dialog"`, `aria-modal`, um `aria-label`
  que diga de quem é, e `tabIndex={-1}` na caixa. O hook leva o foco para dentro, prende o Tab
  ali e devolve o foco a quem abriu. Há teste que confere.
- **Todo campo precisa de nome acessível** — `<label htmlFor>`, `<label>` envolvendo, ou
  `aria-label`. `placeholder` não conta: some ao digitar e nem todo leitor de tela anuncia. Em
  campo que se repete por linha, ponha o que identifica a linha no nome (`Preço de ${s.nome}`),
  senão são cinco "campo de texto" iguais. Há teste que varre as telas.
- Erros de API voltam como `{ erro: "frase em português" }` com status apropriado.

## Sistema visual (siga, não invente outro)

Metáfora: mesa de corte. As cores são variáveis CSS: padrão em `src/app/globals.css`, troca por
ateliê vinda da tabela `config` (`src/lib/marca.ts`), e o `tailwind.config.ts` só aponta para
elas. **Nunca escreva hex solto** — nem em `className`, nem em `fill`/`stroke` de SVG, senão
aquele pedaço não acompanha a marca do cliente. Use `bg-mata`, `fill-fita`, `stroke-linha`.

Isso é conferido por teste (`testes/desenho.test.mts`), junto com "sem emoji na interface". Se
uma cor fixa for mesmo necessária — o QR precisa de preto sobre branco para o celular ler —
escreva o motivo num comentário `cor-fixa:` no mesmo bloco (vale até a linha em branco
anterior), e o teste aceita. Sem o comentário, o
teste falha e diz o arquivo e a linha.

Os quatro valores abaixo são o padrão; o ateliê pode trocá-los em Painel → Marca, e as
variantes (claro, escuro) saem sozinhas da cor base.

- `mata` #26362E — base de corte, usada na navegação e em botões principais.
- `papel` #FBFBF7 e `papel-fundo` #F2F3EE — papel de molde da área de trabalho.
- `grade` #DCE3E9 — linhas finas, bordas de cartão.
- `giz` #2F5FA8 — links e marcações.
- `fita` #E8B62C — fita métrica: destaque de tempo e de dinheiro. É **fundo**, com texto escuro
  por cima; as outras três são texto. `avisoDeContraste()` já sabe disso e cobra o mínimo da
  norma de cada uma. Ao mexer numa cor, rode `npm test`: há teste que confere a paleta fixa.
- `linha` #B4442E — alinhavo: o que ainda é provisório, e ações destrutivas.

Classes prontas: `.papel-molde`, `.base-corte`, `.cartao`, `.alinhavo` (borda tracejada = pedido
sem data), `.rotulo`, `.btn` + `.btn-principal|secundario|perigo`, `.campo`, `.campo-papel`,
`.num` (monoespaçada com números tabulares — use em todo número, data e valor).

Cantos quase retos (2px), bordas de 1px, sem sombra grande, sem gradiente, sem emoji na
interface. Fontes: Bricolage Grotesque (títulos), Archivo (texto), Azeret Mono (números).

## O que está pronto

Formulário por QR, chegada do pedido no painel, marcação de retirada com envio ao Google
Agenda, lembretes de 72h e 24h, tabela de preços editável (aparece nos dois lados), registro de
entrega e pagamento, sinal de entrada com o quanto falta receber, despesas com lucro por semana
e por mês, gráfico das últimas 8 semanas, fechamento de caixa semanal, avisos de WhatsApp com
texto pronto, extrato em CSV, login por pessoa com tela de equipe, marca (nome, cores e logo)
trocável pelo painel, fotos da peça pelos dois lados, histórico por cliente, cartaz do QR pronto
para imprimir, despesas que se repetem sozinhas.

## Dependências e segurança

Next em **16.3.1** e `googleapis` em **150.0.1**. `npm audit` limpo: **0 vulnerabilidades**.

O caminho foi 15.1.6 → 15.5.23 (31 advisories, incluindo bypass de autorização no middleware)
→ 16.3.1 (fecha o `postcss` e o `sharp` que vinham por dentro do Next).

- O arquivo do portão de autenticação é **`src/proxy.ts`**, não `middleware.ts`: o Next 16
  renomeou a convenção. A função exportada chama-se `proxy`. O `config.matcher` é igual.
- `images: { unoptimized: true }` no `next.config.mjs` mantém a rota `/_next/image` desligada
  (404). Este projeto não usa `next/image` — as imagens vêm do Supabase Storage por `<img>`.
- O que **nunca foi testado de ponta a ponta**: o OAuth do Google Calendar (precisa de
  credenciais) e o sistema inteiro contra um Supabase real. O que já foi verificado rodando o
  servidor: portão de autenticação, formato dos erros de API, páginas abertas e injeção das
  cores da marca.

## Fila do que falta

A fila original acabou. As ideias abaixo não foram pedidas por ninguém ainda — confirme comigo
antes de pegar qualquer uma.

- **Vários ateliês num só sistema** (`atelie_id` em tudo, RLS por ateliê, cadastro
  self-service). É a mudança grande que falta para vender assinatura sem instalar por cliente.
- **Envio automático de WhatsApp**, se um dia valer o cadastro na Meta. Hoje é manual por
  decisão.
- **Relatório do ano**, para imposto.

## Testes

**Guarda só vale depois do teste de injeção.** Escrever, rodar e ver verde não prova nada: dois
guardas desta base nasceram absolvendo todo mundo em silêncio — um por `RegExp` montado em
string, cujo `\s` virou barra literal; outro por procurar uma palavra no texto do arquivo e
encontrá-la num comentário. Antes de confiar num guarda novo, **quebre de propósito o que ele
deveria pegar e confirme que ele acusa.**

Quando um guarda de texto cobre **lógica**, extraia a lógica para um módulo puro e teste as
entradas — foi o que virou `src/lib/periodo.ts` (aritmética de semana/mês) e
`src/lib/endereco.ts`. Cinco guardas liam a tela do Financeiro atrás de `Math.max(0, r - 1)` e
afins: acusavam refatoração inocente e absolviam quebra escrita de outro jeito.

E prefira testar **comportamento** a ler o texto do código: extraia a lógica para uma função pura
(como `ehEnderecoDeTeste`) e teste as entradas de verdade. Guarda que varre fonte é para regra
estrutural — RLS, rota sem autenticação, campo sem rótulo —, não para lógica.

E quando for varrer fonte, **varra literal**: `fonte.includes("from '@/lib/avisos'")`, não um
padrão esperto. Três guardas desta base nasceram quebrados por casamento de padrão — um
`RegExp` montado em string, uma exclusão que casava com o que devia acusar, uma palavra achada
dentro de um comentário. Nenhum dos três acusou nada até eu injetar o defeito de propósito.


`npm test` — `node --test`, sem biblioteca nenhuma, em `testes/*.test.mts`. Cobrem as regras
acima que dão para verificar sem banco. **Ao mexer numa regra de negócio, mexa no teste dela**;
se a regra não tem teste e dá para testar sem banco, escreva.

Os arquivos-fonte importam sem extensão (jeito do Next), então `testes/resolver.mjs` completa a
extensão em tempo de execução. Os testes são `.mts` e entram no `npm run typecheck`, de
propósito: teste que não confere tipo apodrece calado.

## Lint

`npm run lint` — ESLint 9 com `eslint-config-next`, config plana em `eslint.config.mjs`.
Fixe o ESLint no **9**: o plugin do React que vem dentro do `eslint-config-next` quebra no 10.

`react-hooks/set-state-in-effect` está como **aviso, não erro**, e o porquê está escrito no
próprio arquivo de config: ela não distingue `setState` síncrono de `setState` depois de um
`await`, e acusa os carregadores de `dados.ts` sem haver render em cascata. Os 12 avisos de hoje
foram lidos um a um. Se aparecer um novo, leia também — não silencie no automático.

Ao terminar qualquer tarefa: rode `npm run lint`, `npm test`, `npm run typecheck` e
`npm run build`, e me diga em uma frase o que mudou e o que eu preciso testar na tela.
