import type { Event, EventTemplate } from 'nostr-tools';
import { nip19, generateSecretKey, getPublicKey } from 'nostr-tools';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46';

export interface NostrSigner {
  type: 'extension' | 'bunker';
  getPublicKey(): Promise<string>;
  signEvent(template: EventTemplate): Promise<Event>;
  bunkerUri?: string;
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
