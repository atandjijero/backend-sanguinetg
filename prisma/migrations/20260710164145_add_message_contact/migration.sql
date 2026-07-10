-- CreateEnum
CREATE TYPE "StatutMessageContact" AS ENUM ('NOUVEAU', 'REPONDU');

-- CreateTable
CREATE TABLE "messages_contact" (
    "id" TEXT NOT NULL,
    "nomComplet" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "statut" "StatutMessageContact" NOT NULL DEFAULT 'NOUVEAU',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reponse" TEXT,
    "dateReponse" TIMESTAMP(3),
    "repondParId" TEXT,

    CONSTRAINT "messages_contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_contact_statut_idx" ON "messages_contact"("statut");

-- AddForeignKey
ALTER TABLE "messages_contact" ADD CONSTRAINT "messages_contact_repondParId_fkey" FOREIGN KEY ("repondParId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
