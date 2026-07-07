# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — base image with pnpm
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — install all deps (leverages layer cache)
# ──────────────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json                ./apps/web/
COPY packages/types/package.json          ./packages/types/
COPY packages/scoring/package.json        ./packages/scoring/

RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3 — build Next.js app
# ──────────────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /repo

COPY --from=deps /repo/node_modules        ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules 2>/dev/null || true

COPY . .

# Build args passed at docker compose build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter web build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 4 — minimal production image
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# standalone output is self-contained (includes its own node_modules)
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public           ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
