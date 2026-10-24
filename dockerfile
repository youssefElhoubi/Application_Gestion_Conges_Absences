FROM node:22-alpine AS base

# Step 1: Install dependencies & generate Prisma Client
FROM base AS deps

RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Prisma 7 requires its config file during CLI operations
COPY prisma.config.ts ./

# Prisma 7 prisma.config.ts reads DATABASE_URL during schema validation and client generation;
# dummy URL is provided for offline generation without a network connection.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mydb?schema=public"

RUN npm ci

# Explicit generator execution ensuring /app/src/generated/prisma is fully populated
RUN npx prisma generate

# Step 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Explicitly copy generated Prisma Client from deps stage (isolated from host filesystem)
COPY --from=deps /app/src/generated/prisma ./src/generated/prisma

# Run the Next.js build
RUN npm run build

# Step 3: Database migration runner
FROM deps AS migrator
WORKDIR /app
CMD ["npx", "prisma", "migrate", "deploy"]

# Step 4: Seed runner (based on deps with source files needed for seeding)
FROM deps AS seeder
WORKDIR /app
COPY tsconfig.json ./
COPY src ./src
# Explicitly ensure generated client from deps stage is present
COPY --from=deps /app/src/generated/prisma ./src/generated/prisma
COPY tests ./tests
COPY prisma ./prisma

CMD ["npx", "prisma", "db", "seed"]

# Step 5: Prisma Studio runner
FROM deps AS studio
WORKDIR /app
COPY scripts ./scripts
EXPOSE 5555
ENV NODE_OPTIONS="--require /app/scripts/prisma-studio-host.cjs"

CMD ["npx", "prisma", "studio", "--port", "5555", "--browser", "none"]

# Step 6: Production application runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install openssl for Prisma runtime
RUN apk add --no-cache openssl

# Create dedicated unprivileged system user and group (GID/UID 1001)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nextjs

# Copy static assets and public directory with unprivileged ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Next.js standalone server and static chunks with unprivileged ownership
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema, Prisma 7 config, and generated client runtime artifacts
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/generated/prisma ./src/generated/prisma

# Ensure .next cache directory is owned by nextjs for runtime image optimization & prerender cache
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check probing the lightweight database readiness endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]