-- AlterTable
ALTER TABLE "alertes" ADD COLUMN     "centreDonId" TEXT;

-- CreateIndex
CREATE INDEX "alertes_centreDonId_idx" ON "alertes"("centreDonId");

-- AddForeignKey
ALTER TABLE "alertes" ADD CONSTRAINT "alertes_centreDonId_fkey" FOREIGN KEY ("centreDonId") REFERENCES "centres_don"("id") ON DELETE SET NULL ON UPDATE CASCADE;
