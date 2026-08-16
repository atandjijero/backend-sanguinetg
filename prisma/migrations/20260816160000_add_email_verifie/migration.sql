-- AlterTable
ALTER TABLE "utilisateurs" ADD COLUMN "emailVerifie" BOOLEAN NOT NULL DEFAULT false;

-- Grandfather existing accounts: only newly-created accounts should require verification.
UPDATE "utilisateurs" SET "emailVerifie" = true;
