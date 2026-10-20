// Base nueva local y ficticia; nunca usa .env, Neon ni bases existentes.
const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const backend = path.resolve(__dirname, '..');
async function main() {
  const url = new URL(
    'postgresql://multiacademia_test_owner@127.0.0.1:55441/postgres',
  );
  const name = `gestia_demo_mes_test_${randomUUID().replaceAll('-', '')}`;
  const control = new Client({ connectionString: url.toString() });
  await control.connect();
  try {
    await control.query(`CREATE DATABASE "${name}"`);
  } finally {
    await control.end();
  }
  url.pathname = `/${name}`;
  const db = new Client({ connectionString: url.toString() });
  await db.connect();
  try {
    const migrations = path.join(backend, 'prisma/migrations');
    for (const folder of fs
      .readdirSync(migrations)
      .filter((f) => /^\d/.test(f))
      .sort()) {
      await db.query(
        fs.readFileSync(path.join(migrations, folder, 'migration.sql'), 'utf8'),
      );
    }
  } finally {
    await db.end();
  }
  console.log(
    `Integración aislada: 127.0.0.1:55441/${name}. Sin correo ni servicios remotos.`,
  );
  const env = {
    ...process.env,
    DOTENV_CONFIG_PATH: path.join(backend, 'test/__sin_dotenv__'),
    DATABASE_URL: url.toString(),
    RESEND_API_KEY: '',
    EMAIL_FROM: '',
    JWT_SECRET: randomUUID(),
    TEST_DEMO_MES_DB: '1',
  };
  const result = spawnSync(
    process.execPath,
    [
      '--experimental-vm-modules',
      'node_modules/jest/bin/jest.js',
      '--runInBand',
      '--runTestsByPath',
      'src/inscripciones/mes-inicio.spec.ts',
      'src/demo-readonly.spec.ts',
      'src/demo-cors.spec.ts',
    ],
    { cwd: backend, env, stdio: 'inherit', windowsHide: true },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
