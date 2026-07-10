-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "emailEnvoye" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsEnvoye" BOOLEAN NOT NULL DEFAULT false;
