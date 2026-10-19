FROM node:22-alpine AS base

# Step 1: Install dependencies
FROM base AS deps

RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Prisma 7 requires its config file during CLI operations
COPY prisma.config.ts ./

RUN npm ci

# Only used during client generation; no real database connection is made
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mydb?schema=public"

RUN npx prisma generate

# Step 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run the Next.js build
RUN npm run build
# Seed runner: retains dev dependencies and source files
FROM builder AS seeder

CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed"]

# Step 3: Production environment
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install openssl for Prisma runtime
RUN apk add --no-cache openssl

# Copy standalone output and static files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma folder and node_modules containing the Prisma client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a startup script to run migrations before starting the server
RUN echo '#!/bin/sh' > start.sh && \
    echo 'npx prisma migrate deploy' >> start.sh && \
    echo 'node server.js' >> start.sh && \
    chmod +x start.sh

CMD ["./start.sh"]