# ─────────────────────────────────────────────────────────────
# Evora API — Production Dockerfile
# Node 22, multi-stage build, no secrets baked in.
# Railway injects all env vars at runtime via Variables tab.
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma (required on slim images)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files first for layer caching
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install ALL dependencies (including devDeps needed for tsc/prisma)
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Compile TypeScript + copy assets
RUN npm run build:api

# ── Stage 2: Runtime ──────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy only what the server needs to run
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package*.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/assets ./apps/api/assets
COPY --from=builder /app/apps/api/scripts ./apps/api/scripts

EXPOSE 10000

# No secrets here — Railway injects all env vars at container start
CMD ["node", "apps/api/dist/server.js"]
