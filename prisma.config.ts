import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI operations (migrations, db push, introspection) require an unpooled direct connection
    // to Neon PostgreSQL to support session-level advisory locks (pg_advisory_lock).
    // DIRECT_URL is used when provided in production/staging; safely falls back to DATABASE_URL for local development.
    url: process.env.DIRECT_URL || env("DATABASE_URL"),
  },
});