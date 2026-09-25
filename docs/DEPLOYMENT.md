# Despliegue de la demo

## Base de datos

Crear un proyecto Neon independiente. Aplicar las migraciones con la conexión directa y ejecutar el seed sobre la base vacía. Para el runtime serverless usar la conexión con pooling. No reutilizar credenciales del sistema real.

## Vercel

Se usan dos proyectos desde este repositorio:

| Proyecto | Root Directory | Configuración |
| --- | --- | --- |
| instituto-gestion-demo-api | backend | Framework Other, npm ci, npm run build, sin Output Directory |
| instituto-gestion-demo | frontend | Angular, npm ci, npm run build, dist/frontend/browser |

Variables del backend:

- DATABASE_URL: conexión con pooling de la base demo.
- JWT_SECRET: secreto aleatorio exclusivo, al menos 32 bytes.
- ACADEMIA_NOMBRE: Academia Horizonte Demo.

El frontend no necesita secretos. Su destino está definido en frontend/src/app/core/api-config.ts. Si cambiás el dominio de la API, actualizar ese archivo y sus pruebas. Si cambiás el dominio del frontend, actualizar el origen permitido en backend/src/create-app.ts.

Las migraciones y el seed son pasos manuales de instalación; no se ejecutan en cada build. Los cron de cuotas y el envío de emails están desactivados. La demo rechaza escrituras incluso con un JWT válido.

## Actualizaciones

Subir cambios a main dispara los despliegues de los proyectos vinculados. Verificar login, listas, PDFs, rechazos de escritura y consola del navegador. No copiar archivos .env ni configuración .vercel del sistema real.

## Datos de demostración

El seed es de una sola ejecución por base vacía. La demo no requiere reinicios periódicos porque los visitantes no pueden modificar los datos. Para actualizar el ciclo lectivo se debe preparar una nueva base demo y verificarla antes de cambiar la conexión del despliegue.
