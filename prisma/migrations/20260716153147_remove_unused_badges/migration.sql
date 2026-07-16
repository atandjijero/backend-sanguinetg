-- DropForeignKey (donneur_badges references utilisateurs and badges)
ALTER TABLE "donneur_badges" DROP CONSTRAINT IF EXISTS "donneur_badges_donneurId_fkey";
ALTER TABLE "donneur_badges" DROP CONSTRAINT IF EXISTS "donneur_badges_badgeId_fkey";

-- DropTable
DROP TABLE IF EXISTS "donneur_badges";

-- DropTable
DROP TABLE IF EXISTS "badges";
