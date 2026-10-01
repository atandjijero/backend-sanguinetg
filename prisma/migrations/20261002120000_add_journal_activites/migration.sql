-- CreateTable
CREATE TABLE "journal_activites" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "utilisateurNom" TEXT,
    "role" "Role",
    "action" TEXT NOT NULL,
    "methode" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "cible" TEXT,
    "succes" BOOLEAN NOT NULL,
    "codeHttp" INTEGER NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "details" JSONB,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_activites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "journal_activites_dateCreation_idx" ON "journal_activites"("dateCreation");

-- CreateIndex
CREATE INDEX "journal_activites_role_dateCreation_idx" ON "journal_activites"("role", "dateCreation");

-- CreateIndex
CREATE INDEX "journal_activites_utilisateurId_dateCreation_idx" ON "journal_activites"("utilisateurId", "dateCreation");

-- AddForeignKey
ALTER TABLE "journal_activites" ADD CONSTRAINT "journal_activites_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
