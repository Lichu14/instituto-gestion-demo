# Mes de inicio — demo de Gestia

El formulario de nueva inscripción exige elegir un mes de marzo a diciembre.
Envía `mesInicio` como entero de calendario (marzo=3, julio=7, diciembre=12).
El generador crea mensualidades desde ese mes, inclusive, hasta diciembre
del año solicitado; no utiliza el mes actual del servidor.

El campo es un parámetro de creación: no se persiste, no cambia
`fechaInscripcion` y no se acepta en el DTO de actualización. No requiere
migraciones ni modificaciones del esquema.

## Compatibilidad y datos

- Si un cliente omite `mesInicio`, el backend conserva marzo.
- `null`, cadenas, booleanos, decimales y valores fuera de 3–12 se rechazan.
- La matrícula permanece única, con importe completo, período igual al año
  y vencimiento el 10 de marzo, aunque el inicio sea posterior.
- Mensualidades: mismos precios, descuentos, estados y vencimientos UTC del
  día 10. Julio de 2026 genera seis mensualidades, julio–diciembre.
- Se conserva la transacción, las restricciones únicas y las reglas de
  inscripción activa. No se recalculan ni eliminan históricos, cuotas o pagos.

## La demo sigue siendo de solo lectura

El middleware público no cambia: el servidor rechaza el alta con HTTP 403
antes de ejecutar el servicio. El selector puede explorarse; no permite
guardar operaciones desde la web. Tampoco se habilitan correos ni se agrega
multiacademia. CORS se registra antes del bloqueo para que el navegador pueda leer el aviso 403 sin habilitar escrituras.

La generación se verifica invocando el servicio real en pruebas con una base
PostgreSQL nueva, local y ficticia. No se deshabilita el middleware de la
aplicación ni se modifica la base remota.

## Verificación local — 20/10/2026

- Backend: 31 pruebas aprobadas, incluyendo 7 casos con PostgreSQL real
  (marzo, julio, diciembre, otro año, omisión, rollback y concurrencia).
  Se verificaron descuentos, matrícula, UTC e históricos con pagos intactos.
  También se probaron validaciones, rechazo de PATCH y protección de solo lectura. Se verificó CORS tanto en el rechazo 403 como en el preflight.
- Frontend: 4 pruebas aprobadas de selector requerido, payload numérico,
  doble envío, errores/reintentos y navegación de éxito.
- Ambos builds correctos. Angular advierte un bundle inicial de 563,30 kB
  frente al presupuesto orientativo de 500 kB; no bloquea la compilación.
- Revisión visual y de teclado en 1366×768 y 360×800, sin desbordamiento
  horizontal; selección de julio, ayuda, validación y foco visibles.

Comandos, desde los directorios correspondientes:

```text
backend: node test/run-mes-inicio.cjs
backend: npm run build
frontend: npm test -- --watch=false --include=src/app/pages/inscripciones/inscripcion-create/inscripcion-create.spec.ts
frontend: npm run build
```

El runner requiere el PostgreSQL de pruebas ya iniciado en `127.0.0.1:55441`.
Crea una base nueva `gestia_demo_mes_test_<UUID>` con el usuario local de
pruebas; aplica las migraciones existentes sin cargar `.env`, usar servicios
remotos, ejecutar el seed público ni borrar bases anteriores.

## Revisión disponible

La sesión local de esta tarea usa frontend en `http://localhost:4201`,
API real en `http://localhost:3001` y una base ficticia independiente.
El acceso público habitual está precargado en el login.

Además del seed ficticio habitual, contiene el alumno **Julio Inicio Ficticio**
(ID 17), inscripción 25 de 2026: una matrícula y seis mensualidades de
julio a diciembre. Se preparó mediante el servicio real solo en esa base
local; las escrituras HTTP permanecen bloqueadas.

Logs, capturas y evidencia de cuotas se conservan en
`artifacts/mes-inicio-20261020/` (ignorado por Git).
Cambios únicamente locales: sin commit, push ni deploy.
