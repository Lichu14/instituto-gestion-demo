CREATE TABLE "login_intentos" (
    "clave" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL,
    "expira" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "login_intentos_pkey" PRIMARY KEY ("clave")
);

CREATE INDEX "login_intentos_expira_idx" ON "login_intentos"("expira");
