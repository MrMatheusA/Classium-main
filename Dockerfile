# ==============================================================================
# ESTÁGIO 1: BUILD (FRONTEND + BACKEND) E DEPENDÊNCIAS VIA BUN
# ==============================================================================
FROM oven/bun:1.2.4-slim AS builder

WORKDIR /build

# development garante que as devDependencies (vite, esbuild, etc.) sejam instaladas
ENV NODE_ENV=development

# Variáveis embutidas no frontend em tempo de build.
# No Coolify, marque-as como "Available during build".
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
# Sinal de ambiente exigido por src/lib/supabase/config.ts fora da Vercel
# (production | staging). Sem ele, o build de produção é considerado ambíguo.
ARG VITE_APP_ENV

# Copiar manifesto e lockfile primeiro para aproveitar cache de camadas
COPY package.json bun.lock ./

# Instalação reproduzível congelada pelo lockfile oficial
RUN bun install --frozen-lockfile

# Copiar todo o código-fonte (frontend + backend), filtrado pelo .dockerignore
COPY . .

# Compilar o frontend com Vite -> /build/dist
# NODE_ENV=production evita que o React seja empacotado em modo de desenvolvimento
RUN NODE_ENV=production bun run build:client

# Compilar o servidor backend via esbuild -> /build/dist-server/server.cjs
RUN bun run build:server

# Instalar dependências estritamente de produção para a imagem final
RUN mkdir -p /build/prod_deps && \
    cp package.json bun.lock /build/prod_deps/ && \
    cd /build/prod_deps && \
    bun install --frozen-lockfile --production

# ==============================================================================
# ESTÁGIO 2: RUNNER MINIMALISTA EM NODE.JS 22 LTS
# ==============================================================================
FROM node:22-bookworm-slim AS runner

LABEL maintainer="Classium Gestão Educacional"
LABEL description="Classium (frontend + backend Express) conteinerizado"

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Criar diretórios operacionais vazios atribuídos ao usuário não-root node
RUN mkdir -p /app/data /app/uploads/thumbnails /app/dist /app/dist-server && \
    chown -R node:node /app

# Copiar frontend compilado, bundle do servidor e node_modules de produção
COPY --chown=node:node --from=builder /build/dist /app/dist
COPY --chown=node:node --from=builder /build/dist-server /app/dist-server
COPY --chown=node:node --from=builder /build/prod_deps/node_modules /app/node_modules
COPY --chown=node:node --from=builder /build/package.json /app/package.json

# Execução segura com usuário não-root
USER node

EXPOSE 3000

# Health check operacional nativo via endpoint HTTP /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e 'require("http").get("http://127.0.0.1:" + (process.env.PORT || 3000) + "/api/health", (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on("error", () => process.exit(1))'

CMD ["node", "dist-server/server.cjs"]