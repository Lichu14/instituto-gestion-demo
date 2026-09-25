# Instituto Gestión

## Proyecto

Sistema de gestión para un instituto de inglés.

## Stack

- Frontend: Angular
- Backend: NestJS
- ORM: Prisma
- Base de datos: PostgreSQL
- Producción: Neon + Vercel

## Estructura

- `/frontend`: aplicación Angular.
- `/backend`: API NestJS.
- Prisma/schema y migraciones: mantenerlos sincronizados con los cambios de base de datos.

## Forma de trabajar

- Antes de modificar código, inspeccionar la implementación existente.
- Hacer cambios pequeños y específicos.
- No modificar funcionalidades no relacionadas con la tarea.
- No modificar backend, base de datos o API cuando la tarea sea exclusivamente visual.
- Después de modificar código, ejecutar las verificaciones disponibles.
- Para cambios de frontend, utilizar el navegador para verificar visualmente la funcionalidad cuando sea posible.
- No declarar una tarea terminada solamente porque el código compila: verificar el comportamiento.

## Diseño

La interfaz debe ser:

- minimalista
- moderna
- limpia
- cálida
- profesional
- sobria
- elegante
- funcional

Evitar interfaces recargadas, exceso de colores, animaciones innecesarias y elementos decorativos sin función.

## Dominios principales

- Alumnos
- Profesoras
- Cursos
- Inscripciones
- Cuotas
- Pagos

Las reglas de negocio específicas de estos dominios se documentarán en `docs/` a medida que el proyecto avance.