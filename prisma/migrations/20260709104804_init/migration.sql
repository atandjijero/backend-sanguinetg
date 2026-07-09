-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEDECIN', 'AGENT_CNTS', 'DONNEUR');

-- CreateEnum
CREATE TYPE "StatutUtilisateur" AS ENUM ('ACTIF', 'INACTIF');

-- CreateEnum
CREATE TYPE "GroupeSanguin" AS ENUM ('A_POSITIF', 'A_NEGATIF', 'B_POSITIF', 'B_NEGATIF', 'AB_POSITIF', 'AB_NEGATIF', 'O_POSITIF', 'O_NEGATIF');

-- CreateEnum
CREATE TYPE "StatutAlerte" AS ENUM ('OUVERTE', 'FERMEE');

-- CreateEnum
CREATE TYPE "StatutReponse" AS ENUM ('JE_VIENS', 'INDISPONIBLE');

-- CreateEnum
CREATE TYPE "CategorieConseil" AS ENUM ('AVANT_DON', 'APRES_DON', 'ELIGIBILITE');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('SMS', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "StatutNotification" AS ENUM ('ENVOYEE', 'RECUE', 'LUE');

-- CreateEnum
CREATE TYPE "TypeRecompense" AS ENUM ('BADGE', 'CERTIFICAT', 'VIVRES', 'TRANSPORT', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutRecompense" AS ENUM ('ATTRIBUEE', 'UTILISEE', 'EXPIREE');

-- CreateTable
CREATE TABLE "quartiers" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "quartiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "motDePasse" TEXT,
    "role" "Role" NOT NULL,
    "statut" "StatutUtilisateur" NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "groupeSanguin" "GroupeSanguin",
    "quartierId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "dateInscription" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertes" (
    "id" TEXT NOT NULL,
    "groupeSanguinRequis" "GroupeSanguin" NOT NULL,
    "quartierId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "rayonKm" DOUBLE PRECISION DEFAULT 10,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutAlerte" NOT NULL DEFAULT 'OUVERTE',
    "creeParId" TEXT NOT NULL,

    CONSTRAINT "alertes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reponses" (
    "id" TEXT NOT NULL,
    "alerteId" TEXT NOT NULL,
    "donneurId" TEXT NOT NULL,
    "statut" "StatutReponse" NOT NULL,
    "dateReponse" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reponses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carnets_digitaux" (
    "id" TEXT NOT NULL,
    "donneurId" TEXT NOT NULL,
    "dateDon" TIMESTAMP(3) NOT NULL,
    "centreDon" TEXT NOT NULL,
    "messageRemerciement" TEXT,
    "rappelProchaineDate" TIMESTAMP(3),
    "reponseId" TEXT,
    "recompenseId" TEXT,

    CONSTRAINT "carnets_digitaux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conseils_sante" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "categorie" "CategorieConseil" NOT NULL,
    "datePublication" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valideParId" TEXT NOT NULL,

    CONSTRAINT "conseils_sante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "critereAttribution" TEXT NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donneur_badges" (
    "id" TEXT NOT NULL,
    "donneurId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "dateObtention" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donneur_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "statut" "StatutNotification" NOT NULL DEFAULT 'ENVOYEE',
    "contenu" TEXT,
    "dateEnvoi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "donneurId" TEXT NOT NULL,
    "alerteId" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recompenses" (
    "id" TEXT NOT NULL,
    "donneurId" TEXT NOT NULL,
    "type" "TypeRecompense" NOT NULL,
    "description" TEXT NOT NULL,
    "critereAttribution" TEXT,
    "dateAttribution" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutRecompense" NOT NULL DEFAULT 'ATTRIBUEE',
    "attribueParId" TEXT,

    CONSTRAINT "recompenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quartiers_nom_key" ON "quartiers"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_telephone_key" ON "utilisateurs"("telephone");

-- CreateIndex
CREATE INDEX "utilisateurs_role_statut_idx" ON "utilisateurs"("role", "statut");

-- CreateIndex
CREATE INDEX "utilisateurs_groupeSanguin_quartierId_idx" ON "utilisateurs"("groupeSanguin", "quartierId");

-- CreateIndex
CREATE INDEX "alertes_statut_groupeSanguinRequis_idx" ON "alertes"("statut", "groupeSanguinRequis");

-- CreateIndex
CREATE INDEX "alertes_creeParId_idx" ON "alertes"("creeParId");

-- CreateIndex
CREATE INDEX "alertes_quartierId_idx" ON "alertes"("quartierId");

-- CreateIndex
CREATE INDEX "reponses_donneurId_idx" ON "reponses"("donneurId");

-- CreateIndex
CREATE UNIQUE INDEX "reponses_alerteId_donneurId_key" ON "reponses"("alerteId", "donneurId");

-- CreateIndex
CREATE UNIQUE INDEX "carnets_digitaux_reponseId_key" ON "carnets_digitaux"("reponseId");

-- CreateIndex
CREATE UNIQUE INDEX "carnets_digitaux_recompenseId_key" ON "carnets_digitaux"("recompenseId");

-- CreateIndex
CREATE INDEX "carnets_digitaux_donneurId_idx" ON "carnets_digitaux"("donneurId");

-- CreateIndex
CREATE INDEX "conseils_sante_categorie_idx" ON "conseils_sante"("categorie");

-- CreateIndex
CREATE INDEX "conseils_sante_valideParId_idx" ON "conseils_sante"("valideParId");

-- CreateIndex
CREATE UNIQUE INDEX "badges_nom_key" ON "badges"("nom");

-- CreateIndex
CREATE INDEX "donneur_badges_badgeId_idx" ON "donneur_badges"("badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "donneur_badges_donneurId_badgeId_key" ON "donneur_badges"("donneurId", "badgeId");

-- CreateIndex
CREATE INDEX "notifications_donneurId_statut_idx" ON "notifications"("donneurId", "statut");

-- CreateIndex
CREATE INDEX "notifications_alerteId_idx" ON "notifications"("alerteId");

-- CreateIndex
CREATE INDEX "recompenses_donneurId_idx" ON "recompenses"("donneurId");

-- CreateIndex
CREATE INDEX "recompenses_attribueParId_idx" ON "recompenses"("attribueParId");

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_quartierId_fkey" FOREIGN KEY ("quartierId") REFERENCES "quartiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertes" ADD CONSTRAINT "alertes_quartierId_fkey" FOREIGN KEY ("quartierId") REFERENCES "quartiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertes" ADD CONSTRAINT "alertes_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponses" ADD CONSTRAINT "reponses_alerteId_fkey" FOREIGN KEY ("alerteId") REFERENCES "alertes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponses" ADD CONSTRAINT "reponses_donneurId_fkey" FOREIGN KEY ("donneurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carnets_digitaux" ADD CONSTRAINT "carnets_digitaux_donneurId_fkey" FOREIGN KEY ("donneurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carnets_digitaux" ADD CONSTRAINT "carnets_digitaux_reponseId_fkey" FOREIGN KEY ("reponseId") REFERENCES "reponses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carnets_digitaux" ADD CONSTRAINT "carnets_digitaux_recompenseId_fkey" FOREIGN KEY ("recompenseId") REFERENCES "recompenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conseils_sante" ADD CONSTRAINT "conseils_sante_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donneur_badges" ADD CONSTRAINT "donneur_badges_donneurId_fkey" FOREIGN KEY ("donneurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donneur_badges" ADD CONSTRAINT "donneur_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_donneurId_fkey" FOREIGN KEY ("donneurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alerteId_fkey" FOREIGN KEY ("alerteId") REFERENCES "alertes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recompenses" ADD CONSTRAINT "recompenses_donneurId_fkey" FOREIGN KEY ("donneurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recompenses" ADD CONSTRAINT "recompenses_attribueParId_fkey" FOREIGN KEY ("attribueParId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
