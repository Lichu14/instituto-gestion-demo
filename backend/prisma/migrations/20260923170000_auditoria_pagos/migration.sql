BEGIN;

CREATE TYPE "AccionPago" AS ENUM ('CREADO', 'MODIFICADO', 'ANULADO');

-- Agregar primero sin default mantiene NULL para los pagos históricos.
ALTER TABLE "pagos"
ADD COLUMN "usuarioRegistroId" INTEGER,
ADD COLUMN "fechaRegistro" TIMESTAMPTZ(3);
ALTER TABLE "pagos" ALTER COLUMN "fechaRegistro" SET DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "pago_eventos" (
    "id" SERIAL NOT NULL,
    "pagoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accion" "AccionPago" NOT NULL,
    "anterior" JSONB,
    "nuevo" JSONB NOT NULL,
    "motivo" TEXT,
    CONSTRAINT "pago_eventos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pagos_usuarioRegistroId_idx" ON "pagos"("usuarioRegistroId");
CREATE INDEX "pago_eventos_pagoId_fecha_id_idx" ON "pago_eventos"("pagoId", "fecha", "id");
CREATE INDEX "pago_eventos_usuarioId_idx" ON "pago_eventos"("usuarioId");
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_usuarioRegistroId_fkey"
  FOREIGN KEY ("usuarioRegistroId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pago_eventos" ADD CONSTRAINT "pago_eventos_pagoId_fkey"
  FOREIGN KEY ("pagoId") REFERENCES "pagos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pago_eventos" ADD CONSTRAINT "pago_eventos_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- El historial admite inserciones; sus eventos previos no se reescriben ni eliminan.
CREATE FUNCTION impedir_cambio_evento_pago() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'El historial de pagos es inmutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER pago_eventos_inmutables
  BEFORE UPDATE OR DELETE ON "pago_eventos"
  FOR EACH ROW EXECUTE FUNCTION impedir_cambio_evento_pago();

COMMIT;
