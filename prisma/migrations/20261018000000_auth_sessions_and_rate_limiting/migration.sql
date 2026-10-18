-- AlterTable: Add security metadata columns to User model
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMPTZ(6);

-- CreateTable: Session model for relational session management and refresh-token rotation
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "userId" VARCHAR(50) NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "familyId" VARCHAR(50) NOT NULL,
    "userAgent" VARCHAR(255),
    "ipAddress" VARCHAR(45),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RateLimitLedger for multi-instance distributed rate limiting and progressive delays
CREATE TABLE IF NOT EXISTS "RateLimitLedger" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "lastAttempt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resetAt" TIMESTAMPTZ(6) NOT NULL,
    "blockedUntil" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RateLimitLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_userId_isRevoked_idx" ON "Session"("userId", "isRevoked");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_familyId_idx" ON "Session"("familyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RateLimitLedger_key_key" ON "RateLimitLedger"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RateLimitLedger_resetAt_idx" ON "RateLimitLedger"("resetAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RateLimitLedger_blockedUntil_idx" ON "RateLimitLedger"("blockedUntil");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey'
    ) THEN
        ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
