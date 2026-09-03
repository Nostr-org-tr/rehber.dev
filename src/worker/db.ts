import type { D1Database } from '@cloudflare/workers-types';
import type { Nip05Record } from '../shared/types';

const RESERVED_NAMES = new Set([
  'admin',
  'administrator',
  'root',
  'system',
  'api',
  'www',
  'mail',
  'support',
  'help',
  'info',
  'security',
  'billing',
  'dev',
  'relay',
  'nostr',
  'lightning',
  'lnurl',
  'alby',
  'wallet'
]);

export function validateName(name: string): { valid: boolean; normalized: string; reason?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, normalized: '', reason: 'Kullanıcı adı boş olamaz' };
  }

  const normalized = name.trim().toLowerCase();

  // Root identifier '_' is allowed
  if (normalized === '_') {
    return { valid: true, normalized };
  }

  if (normalized.length < 2) {
    return { valid: false, normalized, reason: 'Kullanıcı adı en az 2 karakter olmalıdır' };
  }

  if (normalized.length > 64) {
    return { valid: false, normalized, reason: 'Kullanıcı adı en fazla 64 karakter olabilir' };
  }

  const validCharsRegex = /^[a-z0-9-_.]+$/;
  if (!validCharsRegex.test(normalized)) {
    return {
      valid: false,
      normalized,
      reason: 'Kullanıcı adı yalnızca küçük harf (a-z), rakam (0-9), nokta (.), tire (-) ve alt çizgi (_) içerebilir'
    };
  }

  if (RESERVED_NAMES.has(normalized)) {
    return { valid: false, normalized, reason: 'Bu kullanıcı adı sistem tarafından ayrılmıştır' };
  }

  return { valid: true, normalized };
}

export function validateLightningAddress(addr: string | null | undefined): { valid: boolean; normalized: string | null; reason?: string } {
  if (!addr || !addr.trim()) {
    return { valid: true, normalized: null };
  }

  const trimmed = addr.trim().toLowerCase();
  const parts = trimmed.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, normalized: null, reason: 'Geçersiz Lightning adresi formatı (örn: kullanici@getalby.com)' };
  }

  if (!parts[1].includes('.')) {
    return { valid: false, normalized: null, reason: 'Lightning adresi geçerli bir alan adı içermelidir' };
  }

  return { valid: true, normalized: trimmed };
}

export async function getRecordByName(db: D1Database, name: string): Promise<Nip05Record | null> {
  const normalized = name.trim().toLowerCase();
  const row = await db
    .prepare('SELECT name, pubkey, relays, lightning_address, created_at, updated_at FROM nip05_records WHERE name = ?')
    .bind(normalized)
    .first<{
      name: string;
      pubkey: string;
      relays: string;
      lightning_address: string | null;
      created_at: number;
      updated_at: number;
    }>();

  if (!row) {
    return null;
  }

  let relays: string[] = [];
  try {
    relays = JSON.parse(row.relays);
  } catch {
    relays = [];
  }

  return {
    name: row.name,
    pubkey: row.pubkey,
    relays,
    lightning_address: row.lightning_address,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function getRecordByPubkey(db: D1Database, pubkey: string): Promise<Nip05Record | null> {
  const normalizedPubkey = pubkey.trim().toLowerCase();
  const row = await db
    .prepare('SELECT name, pubkey, relays, lightning_address, created_at, updated_at FROM nip05_records WHERE pubkey = ?')
    .bind(normalizedPubkey)
    .first<{
      name: string;
      pubkey: string;
      relays: string;
      lightning_address: string | null;
      created_at: number;
      updated_at: number;
    }>();

  if (!row) {
    return null;
  }

  let relays: string[] = [];
  try {
    relays = JSON.parse(row.relays);
  } catch {
    relays = [];
  }

  return {
    name: row.name,
    pubkey: row.pubkey,
    relays,
    lightning_address: row.lightning_address,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function createRecord(
  db: D1Database,
  data: { name: string; pubkey: string; relays: string[]; lightning_address?: string | null }
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const normalizedName = data.name.trim().toLowerCase();
  const normalizedPubkey = data.pubkey.trim().toLowerCase();
  const relaysJson = JSON.stringify(data.relays || []);
  const lightningAddr = data.lightning_address ? data.lightning_address.trim().toLowerCase() : null;

  await db
    .prepare(
      'INSERT INTO nip05_records (name, pubkey, relays, lightning_address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(normalizedName, normalizedPubkey, relaysJson, lightningAddr, now, now)
    .run();
}

export async function updateRecord(
  db: D1Database,
  pubkey: string,
  data: { relays: string[]; lightning_address?: string | null }
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const normalizedPubkey = pubkey.trim().toLowerCase();
  const relaysJson = JSON.stringify(data.relays || []);
  const lightningAddr = data.lightning_address ? data.lightning_address.trim().toLowerCase() : null;

  await db
    .prepare(
      'UPDATE nip05_records SET relays = ?, lightning_address = ?, updated_at = ? WHERE pubkey = ?'
    )
    .bind(relaysJson, lightningAddr, now, normalizedPubkey)
    .run();
}

export async function deleteRecordByPubkey(db: D1Database, pubkey: string): Promise<void> {
  const normalizedPubkey = pubkey.trim().toLowerCase();
  await db.prepare('DELETE FROM nip05_records WHERE pubkey = ?').bind(normalizedPubkey).run();
}
