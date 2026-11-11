-- Q.P.E.E.G · base de datos D1 del servidor de sincronización (Cloudflare)
-- El servidor no puede leer los datos: guarda bloques cifrados en el teléfono,
-- identificados por una huella del código de cuenta (no el código).

CREATE TABLE IF NOT EXISTS vaults (
    id          TEXT PRIMARY KEY CHECK (length(id) = 64),
    blob        TEXT NOT NULL,
    rev         INTEGER NOT NULL DEFAULT 1,
    updated_at  INTEGER NOT NULL
);

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
