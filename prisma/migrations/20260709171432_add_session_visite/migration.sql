-- CreateTable
CREATE TABLE "sessions_visite" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "premiereActivite" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derniereActivite" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pagesVues" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "sessions_visite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_visite_sessionId_key" ON "sessions_visite"("sessionId");

-- CreateIndex
CREATE INDEX "sessions_visite_derniereActivite_idx" ON "sessions_visite"("derniereActivite");

-- AddForeignKey
ALTER TABLE "sessions_visite" ADD CONSTRAINT "sessions_visite_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
