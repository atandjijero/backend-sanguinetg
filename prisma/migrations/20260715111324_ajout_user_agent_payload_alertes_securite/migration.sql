-- AlterTable
ALTER TABLE "alertes_securite" ADD COLUMN     "payload" JSONB,
ADD COLUMN     "userAgent" TEXT;
