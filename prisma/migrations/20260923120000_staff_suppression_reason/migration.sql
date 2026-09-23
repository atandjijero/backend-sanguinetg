CREATE TABLE "staff_suppressions" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "utilisateurNom" TEXT NOT NULL,
    "utilisateurRole" "Role" NOT NULL,
    "supprimeParId" TEXT NOT NULL,
    "raison" TEXT NOT NULL,
    "dateSuppression" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_suppressions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "staff_suppressions_utilisateurId_idx" ON "staff_suppressions"("utilisateurId");
CREATE INDEX "staff_suppressions_supprimeParId_idx" ON "staff_suppressions"("supprimeParId");

ALTER TABLE "alertes" DROP CONSTRAINT "alertes_creeParId_fkey";
ALTER TABLE "alertes"
  ADD CONSTRAINT "alertes_creeParId_fkey"
  FOREIGN KEY ("creeParId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conseils_sante" DROP CONSTRAINT "conseils_sante_valideParId_fkey";
ALTER TABLE "conseils_sante"
  ADD CONSTRAINT "conseils_sante_valideParId_fkey"
  FOREIGN KEY ("valideParId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
