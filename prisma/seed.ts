import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const QUARTIERS_LOME = [
  { nom: 'Bè', latitude: 6.1256, longitude: 1.2437 },
  { nom: 'Tokoin', latitude: 6.135, longitude: 1.227 },
  { nom: 'Adidogomé', latitude: 6.175, longitude: 1.165 },
  { nom: 'Agoè', latitude: 6.18, longitude: 1.19 },
  { nom: 'Nyékonakpoè', latitude: 6.128, longitude: 1.215 },
  { nom: 'Kodjoviakopé', latitude: 6.129, longitude: 1.205 },
  { nom: 'Hédzranawoé', latitude: 6.15, longitude: 1.235 },
  { nom: 'Baguida', latitude: 6.145, longitude: 1.335 },
  { nom: 'Autre quartier de Lomé', latitude: 6.1319, longitude: 1.2228 },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  for (const quartier of QUARTIERS_LOME) {
    await prisma.quartier.upsert({
      where: { nom: quartier.nom },
      update: { latitude: quartier.latitude, longitude: quartier.longitude },
      create: quartier,
    });
  }

  console.log(`${QUARTIERS_LOME.length} quartiers de Lomé synchronisés.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
