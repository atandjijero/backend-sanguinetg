-- AlterTable
ALTER TABLE "utilisateurs" ADD COLUMN "consentementDate" TIMESTAMP(3);

-- Backfill: les donneurs déjà inscrits ont déjà coché la case de consentement côté
-- formulaire (obligatoire en HTML) avant que ce ne soit vérifié/tracé côté serveur.
-- On approxime la date de consentement par leur date d'inscription connue.
UPDATE "utilisateurs"
SET "consentementDate" = COALESCE("dateInscription", "createdAt")
WHERE "role" = 'DONNEUR';
