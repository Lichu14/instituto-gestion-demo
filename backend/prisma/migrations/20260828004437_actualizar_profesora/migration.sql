/*
  Warnings:

  - You are about to drop the column `activa` on the `profesoras` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EstadoProfesora" AS ENUM ('ACTIVA', 'INACTIVA');

-- AlterTable
ALTER TABLE "profesoras" DROP COLUMN "activa",
ADD COLUMN     "estado" "EstadoProfesora" NOT NULL DEFAULT 'ACTIVA',
ADD COLUMN     "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
