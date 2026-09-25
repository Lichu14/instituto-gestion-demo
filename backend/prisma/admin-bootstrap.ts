import * as bcrypt from 'bcrypt';
import type { Prisma } from '../generated/prisma/client';

export function bootstrapConfig(env: NodeJS.ProcessEnv) {
  const email = env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  const nombre = env.BOOTSTRAP_ADMIN_NOMBRE?.trim();
  const password = env.BOOTSTRAP_ADMIN_PASSWORD;
  if (
    !email ||
    !nombre ||
    !password ||
    password.trim().length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new Error(
      'Configurá BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NOMBRE y BOOTSTRAP_ADMIN_PASSWORD (mínimo 12 caracteres y máximo 72 bytes).',
    );
  }
  return { email, nombre, password };
}

export async function bootstrapAdmin(
  prisma: Pick<Prisma.TransactionClient, 'usuario'>,
  config: ReturnType<typeof bootstrapConfig>,
) {
  const passwordHash = await bcrypt.hash(config.password, 12);
  return prisma.usuario.upsert({
    where: { email: config.email },
    // Ejecutar el bootstrap de nuevo nunca cambia una cuenta existente.
    update: {},
    create: {
      email: config.email,
      nombre: config.nombre,
      passwordHash,
      rol: 'ADMIN',
      activo: true,
    },
    select: { id: true },
  });
}
