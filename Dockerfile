
# ==============================================================================
# CLASSIUM — DOCKERFILE
# FRONTEND VITE + BACKEND EXPRESS + BUN
# COOLIFY / UBUNTU 24.04
# ==============================================================================

# ==============================================================================
# ESTÁGIO 1: BUILD
# ==============================================================================

FROM oven/bun:1.2.4-slim AS builder

WORKDIR /build

ENV NODE_ENV=development

# ------------------------------------------------------------------------------
# VARIÁVEIS DO SUPABASE — BUILD TIME
# ------------------------------------------------------------------------------

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_APP_ENV=production

# Disponibilizar variáveis para o Vite durante a compilação
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_APP_ENV=${VITE_APP_ENV}

# ------------------------------------------------------------------------------
# VALIDAR VARIÁVEIS ANTES DO BUILD
# ------------------------------------------------------------------------------

RUN node -e '\
const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_APP_ENV"]; \
let failed = false; \
for (const key of required) { \
  const value = process.env[key]; \
  console.log(key + ": " + (value ? "PRESENTE" : "AUSENTE")); \
  if (!value) failed = true; \
} \
if (failed) { \
  console.error("ERRO: Variáveis obrigatórias não foram disponibilizadas durante o build."); \
  process.exit(1); \
} \
'

# ------------------------------------------------------------------------------
# INSTALAÇÃO DAS DEPENDÊNCIAS
# ------------------------------------------------------------------------------

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

# ------------------------------------------------------------------------------
# CÓDIGO-FONTE
# ------------------------------------------------------------------------------

COPY . .

# ------------------------------------------------------------------------------
# BUILD FRONTEND
# ------------------------------------------------------------------------------

RUN NODE_ENV=production bun run build:client

# ------------------------------------------------------------------------------
# BUILD BACKEND
# ------------------------------------------------------------------------------

RUN bun run build:server

# ------------------------------------------------------------------------------
# DEPENDÊNCIAS DE PRODUÇÃO
# ------------------------------------------------------------------------------

RUN mkdir -p /build/prod_deps && \
    cp package.json bun.lock /build/prod_deps/ && \
    cd /build/prod_deps && \
    bun install --frozen-lockfile --production


# ==============================================================================
# ESTÁGIO 2: RUNNER
# ==============================================================================

FROM node:22-bookworm-slim AS runner

LABEL maintainer="Classium Gestão Educacional"
LABEL description="Classium - Frontend Vite + Backend Express"

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# ------------------------------------------------------------------------------
# DIRETÓRIOS E PERMISSÕES
# ------------------------------------------------------------------------------

RUN mkdir -p \
    /app/data \
    /app/uploads/thumbnails \
    /app/dist \
    /app/dist-server && \
    chown -R node:node /app

# ------------------------------------------------------------------------------
# COPIAR ARTEFATOS DO BUILD
# ------------------------------------------------------------------------------

COPY --chown=node:node --from=builder /build/dist /app/dist

COPY --chown=node:node --from=builder /build/dist-server /app/dist-server

COPY --chown=node:node --from=builder /build/prod_deps/node_modules /app/node_modules

COPY --chown=node:node --from=builder /build/package.json /app/package.json

# ------------------------------------------------------------------------------
# SEGURANÇA
# ------------------------------------------------------------------------------

USER node

# ------------------------------------------------------------------------------
# PORTA DA APLICAÇÃO
# ------------------------------------------------------------------------------

EXPOSE 3000

# ------------------------------------------------------------------------------
# HEALTH CHECK
# ------------------------------------------------------------------------------

HEALTHCHECK --interval=30s \
    --timeout=5s \
    --start-period=10s \
    --retries=3 \
    CMD node -e 'require("http").get("http://127.0.0.1:" + (process.env.PORT || 3000) + "/api/health", (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on("error", () => process.exit(1))'

# ------------------------------------------------------------------------------
# INICIALIZAÇÃO
# ------------------------------------------------------------------------------

CMD ["node", "dist-server/server.cjs"]
