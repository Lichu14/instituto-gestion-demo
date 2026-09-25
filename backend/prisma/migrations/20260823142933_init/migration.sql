-- CreateEnum
CREATE TYPE "EstadoAlumno" AS ENUM ('ACTIVO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "TipoCuota" AS ENUM ('MATRICULA', 'MENSUALIDAD');

-- CreateEnum
CREATE TYPE "EstadoCuota" AS ENUM ('PENDIENTE', 'PAGADA', 'VENCIDA', 'ANULADA');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('CONFIRMADO', 'ANULADO');

-- CreateTable
CREATE TABLE "alumnos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "estado" "EstadoAlumno" NOT NULL DEFAULT 'ACTIVO',
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alumnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profesoras" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "profesoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "precioMensual" DECIMAL(65,30) NOT NULL,
    "precioMatricula" DECIMAL(65,30) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "profesoraId" INTEGER NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "id" SERIAL NOT NULL,
    "alumnoId" INTEGER NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuotas" (
    "id" SERIAL NOT NULL,
    "inscripcionId" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "concepto" "TipoCuota" NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCuota" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "cuotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "cuotaId" INTEGER NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "medio" "MedioPago" NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'CONFIRMADO',
    "observaciones" TEXT,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alumnos_dni_key" ON "alumnos"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "profesoras_dni_key" ON "profesoras"("dni");

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_profesoraId_fkey" FOREIGN KEY ("profesoraId") REFERENCES "profesoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "alumnos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cuotaId_fkey" FOREIGN KEY ("cuotaId") REFERENCES "cuotas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
