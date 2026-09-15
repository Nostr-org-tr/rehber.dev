import type { Event, EventTemplate } from 'nostr-tools';
import { nip19, generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46';

export interface NostrSigner {
  type: 'extension' | 'bunker' | 'nsec';
  getPublicKey(): Promise<string>;
  signEvent(template: EventTemplate): Promise<Event>;
  bunkerUri?: string;
  nsec?: string;
}

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: EventTemplate): Promise<Event>;
      getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>;
    };
  }
}

/**
 * Connect using NIP-07 browser extension (e.g. Alby, nos2x, Blockcore)
 */
export async function connectExtension(): Promise<{ signer: NostrSigner; pubkey: string }> {
  if (typeof window === 'undefined' || !window.nostr) {
    throw new Error('Nostr tarayıcı eklentisi bulunamadı (Alby, nos2x vb. kurulu olduğundan emin olun)');
  }

  const pubkey = await window.nostr.getPublicKey();
  if (!pubkey) {
    throw new Error('Eklentiden açık anahtar (pubkey) alınamadı');
  }

  const signer: NostrSigner = {
    type: 'extension',
    getPublicKey: async () => window.nostr!.getPublicKey(),
    signEvent: async (template: EventTemplate) => window.nostr!.signEvent(template)
  };

  return { signer, pubkey };
}

/**
 * Connect using NIP-46 Bunker URI (e.g. bunker://... or user@domain)
 */
export async function connectBunker(bunkerUri: string): Promise<{ signer: NostrSigner; pubkey: string }> {
  const bunkerPointer = await parseBunkerInput(bunkerUri.trim());
  if (!bunkerPointer) {
    throw new Error('Geçersiz Bunker URI formatı');
  }

  // Generate an ephemeral client secret key for NIP-46 RPC
  let clientSecretHex = localStorage.getItem('rehber_bunker_sk');
  let clientSecretKey: Uint8Array;
  if (clientSecretHex) {
    clientSecretKey = new Uint8Array(
      clientSecretHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
  } else {
    clientSecretKey = generateSecretKey();
    const hex = Array.from(clientSecretKey)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem('rehber_bunker_sk', hex);
  }

  const bunkerSigner = new BunkerSigner(clientSecretKey, bunkerPointer);
  await bunkerSigner.connect();

  const pubkey = await bunkerSigner.getPublicKey();

  const signer: NostrSigner = {
    type: 'bunker',
    bunkerUri,
    getPublicKey: async () => pubkey,
    signEvent: async (template: EventTemplate) => bunkerSigner.signEvent(template)
  };

  return { signer, pubkey };
}

/**
 * Parses and validates an nsec string (Bech32 nsec1...) or 64-char hex private key into Uint8Array.
 */
export function parseNsecInput(input: string): Uint8Array {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Özel anahtar boş bırakılamaz');
  }

  // 1. Bech32 format (nsec1...)
  if (trimmed.startsWith('nsec1')) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type === 'nsec' && decoded.data instanceof Uint8Array && decoded.data.length === 32) {
        return decoded.data;
      }
    } catch {
      throw new Error('Geçersiz nsec formatı (Bech32 çözümlenemedi)');
    }
    throw new Error('Geçersiz nsec formatı');
  }

  // 2. 64-character hex format
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    const bytes = new Uint8Array(
      trimmed.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    if (bytes.length === 32) {
      return bytes;
    }
  }

  throw new Error('Geçersiz özel anahtar formatı (nsec1... veya 64 haneli hex formatında olmalıdır)');
}

/**
 * Checks if the given string is a valid nsec or 64-char hex key.
 */
export function isValidNsec(input: string): boolean {
  try {
    parseNsecInput(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Connect using Nostr private key (nsec1... or 64-char hex)
 */
export function connectNsec(input: string): { signer: NostrSigner; pubkey: string } {
  const secretKey = parseNsecInput(input);
  const pubkey = getPublicKey(secretKey);

  const signer: NostrSigner = {
    type: 'nsec',
    nsec: input.trim(),
    getPublicKey: async () => pubkey,
    signEvent: async (template: EventTemplate) => finalizeEvent(template, secretKey)
  };

  return { signer, pubkey };
}

/**
 * Creates a NIP-98 Authorization header token.
 */
export async function createNip98AuthHeader(
  url: string,
  method: string,
  signer: NostrSigner
): Promise<string> {
  const template: EventTemplate = {
    kind: 27235,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['u', url],
      ['method', method.toUpperCase()]
    ],
    content: ''
  };

  const signedEvent = await signer.signEvent(template);
  const jsonStr = JSON.stringify(signedEvent);
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
  return `Nostr ${base64}`;
}

/**
 * Formats a hex pubkey to npub...
 */
export function formatNpub(pubkey: string): string {
  try {
    return nip19.npubEncode(pubkey);
  } catch {
    return pubkey;
  }
}

/**
 * Shortens an npub or hex pubkey for display (e.g. npub1abc...xyz)
 */
export function shortenKey(key: string, head = 8, tail = 6): string {
  if (!key) return '';
  if (key.length <= head + tail) return key;
  return `${key.slice(0, head)}...${key.slice(-tail)}`;
}
