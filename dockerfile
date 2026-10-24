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

# Copy standalone output and static files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and Prisma 7 config file
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/prisma ./prisma
# Copy generated Prisma runtime artifacts
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]