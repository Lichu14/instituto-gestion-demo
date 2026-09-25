# Instituto Gestión

Sistema de gestión para academias de inglés. Centraliza alumnos, docentes, cursos, inscripciones, cuotas y pagos, con trazabilidad de operaciones y documentos PDF.

Desarrollado por **Lisandro Cingolani** · [GitHub](https://github.com/Lichu14)

## Demo pública

**[Abrir demo](https://instituto-gestion-demo.vercel.app)**

- Email: `demo@example.invalid`
- Contraseña: `DemoAcademia2026!`
- Las credenciales ya están completas en la pantalla de acceso.

La demo contiene exclusivamente información ficticia. Es de **solo lectura**: permite navegar, filtrar, consultar el historial y descargar documentos. Los formularios se pueden explorar, pero las escrituras se rechazan en el servidor. No envía emails. No ingreses información personal.

## Qué explorar

1. **Inicio:** indicadores de alumnos, inscripciones y situación financiera.
2. **Alumnos → Sofía Luna:** inscripciones actuales e históricas, descuentos, cuotas y pagos; cada inscripción se pliega de forma independiente.
3. **Estado de cuenta:** descargar el resumen financiero del alumno en PDF.
4. **Pagos:** consultar pagador, usuario registrador, fecha de pago, fecha de registro e historial de eventos.
5. **Comprobante individual:** descargar el documento asociado a un pago.
6. **Cursos y docentes:** horarios y organización de la academia.

## Stack

| Capa | Tecnología |
| --- | --- |
| Interfaz | Angular, TypeScript, CSS responsive |
| API | NestJS, DTOs y validación |
| Persistencia | PostgreSQL, Prisma ORM y migraciones versionadas |
| Autenticación | JWT, bcrypt, limitación de intentos de acceso |
| Documentos | pdf-lib, generación en memoria |
| Despliegue | Vercel y Neon |

## Decisiones de implementación

- Los importes y estados financieros se calculan en el backend, con tipos decimales para los valores monetarios.
- La auditoría diferencia al pagador del usuario autenticado que registró la operación.
- El comprobante individual tiene un único generador reutilizable. La integración con Resend del sistema original está deshabilitada en esta distribución pública.
- La API valida las peticiones y mantiene la autenticación para consultas y exportaciones.
- El modo de solo lectura se aplica antes de los controladores; no depende de ocultar botones.
- Repositorio, secretos, proyectos de despliegue y base de datos independientes del sistema operativo real.
- Esta versión representa una academia. No implementa aislamiento multiempresa ni se presenta como SaaS multitenant.

## Ejecutar localmente

Requisitos: Node.js 24, npm y una base PostgreSQL **vacía, exclusiva para esta demo**.

En `backend`:

~~~powershell
npm ci
Copy-Item .env.example .env
# Completar DATABASE_URL y un JWT_SECRET aleatorio en .env.
npx prisma migrate deploy
$env:CONFIRM_DEMO_DATABASE = 'instituto-gestion-demo'
npm run seed:demo
Remove-Item Env:CONFIRM_DEMO_DATABASE
npm run start:dev
~~~

En otra terminal, dentro de `frontend`:

~~~powershell
npm ci
npm start
~~~

Abrir [localhost:4201](http://localhost:4201). La API escucha en el puerto 3001.

El seed crea 16 alumnos, 3 docentes, 4 cursos, 24 inscripciones y cuotas con pagos completos, parciales y pendientes. Las fechas se generan en relación con el año de ejecución. Usa una transacción y rechaza bases con registros existentes; no borra ni reinicia datos. Las credenciales de acceso son públicas intencionalmente y solo sirven para esta demo.

## Verificaciones

~~~powershell
# En backend
npm test -- --runInBand
npm run build
# En frontend
npm test -- --watch=false
npm run build
~~~

Las pruebas de integración que requieren una base local adicional permanecen deshabilitadas por defecto. No habilitarlas contra una base de producción.

## Despliegue

Ver [configuración de Vercel y Neon](docs/DEPLOYMENT.md). Los secretos se configuran en el entorno y nunca deben incluirse en Git. El historial de este repositorio comienza con una copia sanitizada; no contiene dumps ni historial del sistema real.
