# Imagem do painel do ateliê, para rodar no Easypanel (ou em qualquer lugar
# que aceite um contêiner).
#
# São três estágios para a imagem final não carregar nem o compilador nem as
# dependências de desenvolvimento: só o servidor empacotado pelo Next.

# ---------- 1. dependências ----------
FROM node:22-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2. build ----------
FROM node:22-alpine AS construcao
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .

# ATENÇÃO: tudo que começa com NEXT_PUBLIC_ é gravado dentro do JavaScript que
# vai para o navegador, na hora do build — não na hora de rodar. Passar essas
# três só como variável de execução no Easypanel não adianta: o valor que vale
# é o que estava aqui quando a imagem foi construída.
#
# A mais traiçoeira é a NEXT_PUBLIC_APP_URL: é o endereço que o cartaz do QR
# leva impresso. Construir sem ela imprime um cartaz apontando para localhost,
# e ninguém descobre até a primeira cliente tentar ler o código na parede.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------- 3. o que roda ----------
FROM node:22-alpine AS producao
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# não roda como root: se alguém escapar do processo, escapa para um usuário sem nada
RUN addgroup -g 1001 -S atelie && adduser -u 1001 -S atelie -G atelie

# O `output: 'standalone'` do next.config.mjs monta em .next/standalone um
# servidor com só as dependências que ele usa mesmo. Os arquivos estáticos
# ficam de fora dessa pasta de propósito, por isso a segunda cópia.
COPY --from=construcao --chown=atelie:atelie /app/.next/standalone ./
COPY --from=construcao --chown=atelie:atelie /app/.next/static ./.next/static

USER atelie
EXPOSE 3000

# Sem curl na imagem: o próprio node pergunta se a página de login responde.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
