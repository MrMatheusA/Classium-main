# ==============================================================================
# ESTÁGIO 1: BUILD & PREPARAÇÃO DE DEPENDÊNCIAS VIA BUN
# ==============================================================================
FROM oven/bun:1.2.4-slim AS builder

WORKDIR /build

ENV NODE_ENV=development

# Copiar arquivos de manifesto e lockfile oficial
COPY package.json bun.lock ./

# Instalação reproduzível congelada pelo lockfile oficial
RUN bun install --frozen-lockfile

# Copiar arquivos de configuração e código-fonte do servidor backend
COPY tsconfig.json ./
COPY server.ts ./
COPY server/ ./server/

# Compilar o servidor backend via esbuild gerando dist-server/server.cjs
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
LABEL description="Backend Express conteinerizado para o Classium"

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Criar diretórios operacionais vazios atribuídos ao usuário não-root node
RUN mkdir -p /app/data /app/uploads/thumbnails /app/dist-server && \
    chown -R node:node /app

# Copiar bundle compilado e node_modules estritamente de produção
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
