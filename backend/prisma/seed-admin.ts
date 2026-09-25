import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { bootstrapAdmin, bootstrapConfig } from './admin-bootstrap';

async function main() {
  // Validar antes de abrir una conexión. No hay credenciales predeterminadas.
  const config = bootstrapConfig(process.env);
  delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await bootstrapAdmin(prisma, config);
    console.log(
      'Bootstrap completado. Si la cuenta ya existía, se conservó sin cambios.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error(
    'No se completó el bootstrap. Revisá DATABASE_URL y las variables BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NOMBRE y BOOTSTRAP_ADMIN_PASSWORD (12 caracteres mínimo; 72 bytes máximo).',
  );
  process.exitCode = 1;
});
