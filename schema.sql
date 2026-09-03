-- D1 Schema for rehber.dev NIP-05 & Lightning Address Service
CREATE TABLE IF NOT EXISTS nip05_records (
    name TEXT PRIMARY KEY COLLATE NOCASE,
    pubkey TEXT NOT NULL UNIQUE,
    relays TEXT NOT NULL DEFAULT '[]',
    lightning_address TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nip05_pubkey ON nip05_records(pubkey);

-- Rate limiting table for anti-spam & brute force prevention
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);
