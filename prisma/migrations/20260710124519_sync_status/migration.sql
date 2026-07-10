-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pendente', 'ativo', 'reauth_required');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncError" TEXT,
ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'pendente';

-- CreateIndex
CREATE INDEX "User_syncStatus_idx" ON "User"("syncStatus");

-- Backfill: conta com token já sincronizava (ativo); sem token nunca conectou
-- (pendente, coberto pelo default). Não deriva mais nada de refreshToken depois disto.
UPDATE "User" SET "syncStatus" = 'ativo' WHERE "refreshToken" IS NOT NULL;
