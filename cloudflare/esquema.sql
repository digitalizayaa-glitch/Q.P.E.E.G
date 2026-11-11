-- Q.P.E.E.G · base de datos D1 del servidor de sincronización (Cloudflare)
-- El servidor no puede leer los datos: guarda bloques cifrados en el teléfono,
-- identificados por una huella del código de cuenta (no el código).

CREATE TABLE IF NOT EXISTS vaults (
    id          TEXT PRIMARY KEY CHECK (length(id) = 64),
    blob        TEXT NOT NULL,
    rev         INTEGER NOT NULL DEFAULT 1,
    updated_at  INTEGER NOT NULL,
    seen_at     INTEGER              -- última vez que un teléfono la abrió (se anota como mucho una vez al día)
);
-- Base creada antes de la 1.12.0:  ALTER TABLE vaults ADD COLUMN seen_at INTEGER;

CREATE TABLE IF NOT EXISTS pairs (
    id          TEXT PRIMARY KEY CHECK (length(id) = 64),
    payload     TEXT NOT NULL,
    expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pairs_expires ON pairs (expires_at);

-- Copias anteriores de cada cuenta (para volver atrás desde la app): una cada 3 h como mucho, las 20 últimas
CREATE TABLE IF NOT EXISTS vault_history (
    id          TEXT NOT NULL CHECK (length(id) = 64),
    rev         INTEGER NOT NULL,
    blob        TEXT NOT NULL,
    saved_at    INTEGER NOT NULL,
    PRIMARY KEY (id, rev)
);

-- Cuentas que cambiaron de código: el código viejo deja de funcionar y no se puede volver a crear
CREATE TABLE IF NOT EXISTS retired (
    id          TEXT PRIMARY KEY CHECK (length(id) = 64),
    retired_at  INTEGER NOT NULL
);

-- Errores anónimos de la app (mensaje técnico, versión y tipo de navegador; nada de las cuentas).
-- Los repetidos suman en "count"; se guardan 300 distintos como mucho y se borran a los 60 días.
CREATE TABLE IF NOT EXISTS app_errors (
    key         TEXT PRIMARY KEY,
    msg         TEXT NOT NULL,
    stack       TEXT NOT NULL,
    ver         TEXT NOT NULL,
    ua          TEXT NOT NULL,
    count       INTEGER NOT NULL DEFAULT 1,
    first_at    INTEGER NOT NULL,
    last_at     INTEGER NOT NULL
);

-- Datos de entrenamiento que el usuario aceptó compartir (opcional, se puede retirar).
-- id: anónimo y propio de cada teléfono (no es el de la cuenta). Se borra a los 76 días sin actualizarse.
CREATE TABLE IF NOT EXISTS shared_training (
    id          TEXT PRIMARY KEY,
    ver         TEXT NOT NULL,
    data        TEXT NOT NULL,
    updated_at  INTEGER NOT NULL
);
