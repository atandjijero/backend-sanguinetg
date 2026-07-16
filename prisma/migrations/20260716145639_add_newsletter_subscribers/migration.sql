-- CreateTable
CREATE TABLE "abonnes_newsletter" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateAbonnement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonnes_newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "abonnes_newsletter_email_key" ON "abonnes_newsletter"("email");
