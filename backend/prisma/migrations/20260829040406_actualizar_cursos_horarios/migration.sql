/*
  Warnings:

  - You are about to drop the column `activo` on the `cursos` table. All the data in the column will be lost.
  - You are about to drop the column `nivel` on the `cursos` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EstadoCurso" AS ENUM ('ACTIVO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');

-- AlterTable
ALTER TABLE "cursos" DROP COLUMN "activo",
DROP COLUMN "nivel",
ADD COLUMN     "estado" "EstadoCurso" NOT NULL DEFAULT 'ACTIVO';

-- CreateTable
CREATE TABLE "horarios_cursos" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,

    CONSTRAINT "horarios_cursos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "horarios_cursos" ADD CONSTRAINT "horarios_cursos_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
