/*
  Warnings:

  - A unique constraint covering the columns `[inscripcionId,periodo,concepto]` on the table `cuotas` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[alumnoId,año]` on the table `inscripciones` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "EstadoCuota" ADD VALUE 'PARCIAL';

-- CreateIndex
CREATE UNIQUE INDEX "cuotas_inscripcionId_periodo_concepto_key" ON "cuotas"("inscripcionId", "periodo", "concepto");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_alumnoId_año_key" ON "inscripciones"("alumnoId", "año");
