/*
  Warnings:

  - The values [PARCIAL] on the enum `EstadoCuota` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EstadoCuota_new" AS ENUM ('PENDIENTE', 'PAGO_PARCIAL', 'PAGADA', 'VENCIDA', 'ANULADA');
ALTER TABLE "public"."cuotas" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "cuotas" ALTER COLUMN "estado" TYPE "EstadoCuota_new" USING ("estado"::text::"EstadoCuota_new");
ALTER TYPE "EstadoCuota" RENAME TO "EstadoCuota_old";
ALTER TYPE "EstadoCuota_new" RENAME TO "EstadoCuota";
DROP TYPE "public"."EstadoCuota_old";
ALTER TABLE "cuotas" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';
COMMIT;
