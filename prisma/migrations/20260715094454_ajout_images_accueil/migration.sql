-- CreateEnum
CREATE TYPE "CleImage" AS ENUM ('HERO', 'INSTITUTIONAL_DOCTOR', 'INSTITUTIONAL_VIALS', 'ABOUT_LABORATORY');

-- CreateTable
CREATE TABLE "images_accueil" (
    "id" TEXT NOT NULL,
    "cle" "CleImage" NOT NULL,
    "url" TEXT NOT NULL,
    "cloudinaryId" TEXT NOT NULL,
    "dateMiseAJour" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "images_accueil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "images_accueil_cle_key" ON "images_accueil"("cle");
