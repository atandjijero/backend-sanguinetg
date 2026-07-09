-- CreateTable
CREATE TABLE "centres_don" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "quartierId" TEXT,

    CONSTRAINT "centres_don_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "centres_don_nom_key" ON "centres_don"("nom");

-- AddForeignKey
ALTER TABLE "centres_don" ADD CONSTRAINT "centres_don_quartierId_fkey" FOREIGN KEY ("quartierId") REFERENCES "quartiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: un CentreDon par valeur distincte de l'ancien champ texte "centreDon"
INSERT INTO "centres_don" ("id", "nom")
SELECT DISTINCT ON ("centreDon") md5(random()::text || "centreDon"), "centreDon"
FROM "carnets_digitaux"
WHERE "centreDon" IS NOT NULL
ON CONFLICT ("nom") DO NOTHING;

-- AlterTable: ajouter la colonne nullable, la remplir, puis la rendre obligatoire
ALTER TABLE "carnets_digitaux" ADD COLUMN "centreDonId" TEXT;

UPDATE "carnets_digitaux" c
SET "centreDonId" = cd."id"
FROM "centres_don" cd
WHERE cd."nom" = c."centreDon";

ALTER TABLE "carnets_digitaux" ALTER COLUMN "centreDonId" SET NOT NULL;
ALTER TABLE "carnets_digitaux" DROP COLUMN "centreDon";

-- CreateIndex
CREATE INDEX "carnets_digitaux_centreDonId_idx" ON "carnets_digitaux"("centreDonId");

-- AddForeignKey
ALTER TABLE "carnets_digitaux" ADD CONSTRAINT "carnets_digitaux_centreDonId_fkey" FOREIGN KEY ("centreDonId") REFERENCES "centres_don"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
