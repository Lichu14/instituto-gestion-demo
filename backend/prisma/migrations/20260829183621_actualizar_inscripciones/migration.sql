/*
  Warnings:

  - You are about to drop the column `activa` on the `inscripciones` table. All the data in the column will be lost.
  - You are about to drop the column `fechaFin` on the `inscripciones` table. All the data in the column will be lost.
  - You are about to drop the column `fechaInicio` on the `inscripciones` table. All the data in the column will be lost.
  - Added the required column `año` to the `inscripciones` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoInscripcion" AS ENUM ('ACTIVA', 'COMPLETADA', 'ABANDONADA');

-- AlterTable
ALTER TABLE "inscripciones" DROP COLUMN "activa",
DROP COLUMN "fechaFin",
DROP COLUMN "fechaInicio",
ADD COLUMN     "año" INTEGER NOT NULL,
ADD COLUMN     "descuentoPorcentaje" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "estado" "EstadoInscripcion" NOT NULL DEFAULT 'ACTIVA',
ADD COLUMN     "fechaInscripcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
