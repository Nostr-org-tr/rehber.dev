import { verifyEvent, type Event } from 'nostr-tools';

export interface AuthResult {
  success: boolean;
  pubkey?: string;
  error?: string;
}

/**
 * Validates a NIP-98 Nostr HTTP Auth header.
 * Header format: "Nostr <base64-encoded-json-event>"
 */
export async function verifyNip98Auth(
  request: Request,
  expectedMethod: string
): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return { success: false, error: 'Authorization başlığı eksik' };
  }

  const match = authHeader.match(/^Nostr\s+(.+)$/i);
  if (!match || !match[1]) {
    return { success: false, error: 'Geçersiz Authorization başlığı formatı (Nostr <token> bekleniyor)' };
  }

  let event: Event;
  try {
    const rawJson = atob(match[1].trim());
    event = JSON.parse(rawJson);
  } catch {
    return { success: false, error: 'Nostr auth token çözümlenemedi (Base64/JSON hatası)' };
  }

  // Kind must be 27235
  if (event.kind !== 27235) {
    return { success: false, error: `Geçersiz event kind: ${event.kind} (27235 bekleniyor)` };
  }

  // Check timestamp drift (within 60 seconds)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - event.created_at) > 120) {
    return { success: false, error: 'İstek zaman aşımına uğradı (Zaman farkı > 120 sn)' };
  }

  // Check method tag
  const methodTag = event.tags.find((t) => t[0] === 'method');
  if (!methodTag || methodTag[1].toUpperCase() !== expectedMethod.toUpperCase()) {
    return {
      success: false,
      error: `HTTP method uyuşmazlığı: ${methodTag ? methodTag[1] : 'yok'} != ${expectedMethod}`
    };
  }

  // Check URL tag
  const urlTag = event.tags.find((t) => t[0] === 'u');
  if (!urlTag || !urlTag[1]) {
    return { success: false, error: 'NIP-98 "u" (URL) etiketi eksik' };
  }

  const reqUrl = new URL(request.url);
  try {
    const eventUrl = new URL(urlTag[1]);
    if (eventUrl.pathname !== reqUrl.pathname) {
      return {
        success: false,
        error: `İstek yolu uyuşmazlığı: ${eventUrl.pathname} != ${reqUrl.pathname}`
      };
    }
  } catch {
    return { success: false, error: 'Geçersiz URL etiketi' };
  }

  // Cryptographic signature verification
  const isValid = verifyEvent(event);
  if (!isValid) {
    return { success: false, error: 'Nostr imza doğrulaması başarısız' };
  }

  return { success: true, pubkey: event.pubkey };
}
