-- CreateEnum
CREATE TYPE "TypeAlerteSecurite" AS ENUM ('BRUTE_FORCE', 'CSP_VIOLATION', 'SQL_INJECTION', 'XSS_ATTEMPT');

-- CreateEnum
CREATE TYPE "GraviteAlerteSecurite" AS ENUM ('FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE');

-- CreateTable
CREATE TABLE "alertes_securite" (
    "id" TEXT NOT NULL,
    "type" "TypeAlerteSecurite" NOT NULL,
    "gravite" "GraviteAlerteSecurite" NOT NULL,
    "message" TEXT NOT NULL,
    "ipSource" TEXT,
    "uri" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertes_securite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alertes_securite_type_idx" ON "alertes_securite"("type");

-- CreateIndex
CREATE INDEX "alertes_securite_gravite_idx" ON "alertes_securite"("gravite");

-- CreateIndex
CREATE INDEX "alertes_securite_dateCreation_idx" ON "alertes_securite"("dateCreation");
