import type { D1Database, Fetcher, ExecutionContext } from '@cloudflare/workers-types';
import { verifyNip98Auth } from './auth';
import {
  validateName,
  validateLightningAddress,
  getRecordByName,
  getRecordByPubkey,
  createRecord,
  updateRecord,
  deleteRecordByPubkey
} from './db';
import { handleLnurlPay } from './lnurl';
import { checkRateLimit, getClientIp, cleanupExpiredRateLimits } from './ratelimit';
import { verifyTurnstileToken } from './turnstile';
import { checkApiOrigin } from './origin';
import type { RegisterRequest, UpdateProfileRequest, Nip05Response } from '../shared/types';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  ALLOWED_HOSTS?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, CF-Turnstile-Response',
};

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      ...extraHeaders
    }
  });
}

function errorResponse(error: string, status = 400, extraHeaders: Record<string, string> = {}): Response {
  return jsonResponse({ success: false, error }, status, extraHeaders);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const clientIp = getClientIp(request);

    // Schedule background cleanup occasionally
    if (Math.random() < 0.05) {
      ctx.waitUntil(cleanupExpiredRateLimits(env.DB));
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    // 1. PUBLIC NIP-05 Endpoint: /.well-known/nostr.json?name=<name>
    if (pathname === '/.well-known/nostr.json' && request.method === 'GET') {
      const name = url.searchParams.get('name');

      if (!name) {
        const emptyResponse: Nip05Response = { names: {} };
        return jsonResponse(emptyResponse, 200, {
          'Cache-Control': 'public, max-age=60, s-maxage=120'
        });
      }

      const record = await getRecordByName(env.DB, name);
      if (!record) {
        const notFoundResponse: Nip05Response = { names: {} };
        return jsonResponse(notFoundResponse, 200, {
          'Cache-Control': 'public, max-age=30, s-maxage=60'
        });
      }

      const response: Nip05Response = {
        names: {
          [record.name]: record.pubkey
        }
      };

      if (record.relays && record.relays.length > 0) {
        response.relays = {
          [record.pubkey]: record.relays
        };
      }

      return jsonResponse(response, 200, {
        'Cache-Control': 'public, max-age=60, s-maxage=300'
      });
    }

    // 2. PUBLIC LNURL-pay Endpoint: /.well-known/lnurlp/:name
    if (pathname.startsWith('/.well-known/lnurlp/') && request.method === 'GET') {
      const name = pathname.replace('/.well-known/lnurlp/', '').trim();
      return handleLnurlPay(env.DB, name);
    }

    // -------------------------------------------------------------
    // PROTECTED API ENDPOINTS (/api/*)
    // -------------------------------------------------------------
    if (pathname.startsWith('/api/')) {
      // Layer 1: Origin / Direct API Protection
      const originCheck = checkApiOrigin(request, env.ALLOWED_HOSTS);
      if (!originCheck.valid) {
        return errorResponse(`Doğrudan API erişimi engellendi: ${originCheck.reason}`, 403);
      }

      // Public API Config (Turnstile Site Key)
      if (pathname === '/api/config' && request.method === 'GET') {
        return jsonResponse({
          turnstileSiteKey: env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA'
        });
      }

      // 3. API: Check username availability: /api/check-name?name=...
      if (pathname === '/api/check-name' && request.method === 'GET') {
        // Rate limit: Max 20 name checks per minute per IP
        const rate = await checkRateLimit(env.DB, `check:${clientIp}`, 20, 60);
        if (!rate.allowed) {
          return errorResponse('Çok fazla sorgulama yapıldı. Lütfen biraz bekleyin.', 429, {
            'Retry-After': String(rate.resetInSeconds)
          });
        }

        const name = url.searchParams.get('name') || '';
        const validation = validateName(name);

        if (!validation.valid) {
          return jsonResponse({
            available: false,
            name,
            reason: validation.reason
          });
        }

        const existing = await getRecordByName(env.DB, validation.normalized);
        if (existing) {
          return jsonResponse({
            available: false,
            name: validation.normalized,
            reason: 'Bu kullanıcı adı daha önce alınmış'
          });
        }

        return jsonResponse({
          available: true,
          name: validation.normalized
        });
      }

      // 4. API: Get Profile: /api/profile?pubkey=...
      if (pathname === '/api/profile' && request.method === 'GET') {
        const pubkey = url.searchParams.get('pubkey');
        if (!pubkey) {
          return errorResponse('Pubkey parametresi gerekli', 400);
        }

        const record = await getRecordByPubkey(env.DB, pubkey);
        if (!record) {
          return jsonResponse({ registered: false });
        }

        return jsonResponse({
          registered: true,
          record
        });
      }

      // 5. API: Register Name: POST /api/register (requires NIP-98 auth + Turnstile + Rate limit)
      if (pathname === '/api/register' && request.method === 'POST') {
        // Rate limit: Max 5 registration attempts per hour per IP
        const rate = await checkRateLimit(env.DB, `register:${clientIp}`, 5, 3600);
        if (!rate.allowed) {
          return errorResponse('Çok fazla kayıt denemesi yapıldı. Lütfen 1 saat sonra tekrar deneyin.', 429, {
            'Retry-After': String(rate.resetInSeconds)
          });
        }

        // NIP-98 Auth Check
        const auth = await verifyNip98Auth(request, 'POST');
        if (!auth.success || !auth.pubkey) {
          return errorResponse(auth.error || 'Kimlik doğrulama başarısız', 401);
        }

        let body: RegisterRequest;
        try {
          body = await request.json();
        } catch {
          return errorResponse('Geçersiz JSON gövdesi', 400);
        }

        // Turnstile Bot Verification Check
        const turnstileSecret = env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
        const turnstileCheck = await verifyTurnstileToken(turnstileSecret, body.turnstile_token, clientIp);
        if (!turnstileCheck.success) {
          return errorResponse(turnstileCheck.error || 'Bot koruması doğrulaması başarısız', 403);
        }

        const nameValidation = validateName(body.name);
        if (!nameValidation.valid) {
          return errorResponse(nameValidation.reason || 'Geçersiz kullanıcı adı', 400);
        }

        const lnValidation = validateLightningAddress(body.lightning_address);
        if (!lnValidation.valid) {
          return errorResponse(lnValidation.reason || 'Geçersiz Lightning adresi', 400);
        }

        // Check if user already registered a name
        const existingUserRecord = await getRecordByPubkey(env.DB, auth.pubkey);
        if (existingUserRecord) {
          return errorResponse(`Bu hesap zaten '${existingUserRecord.name}' adına sahip. Önce mevcut kaydınızı silebilirsiniz.`, 400);
        }

        // Check if name is taken
        const existingNameRecord = await getRecordByName(env.DB, nameValidation.normalized);
        if (existingNameRecord) {
          return errorResponse('Bu kullanıcı adı başka bir kullanıcı tarafından alınmış', 409);
        }

        // Clean relays list
        const cleanRelays = Array.isArray(body.relays)
          ? body.relays.filter((r) => typeof r === 'string' && (r.startsWith('wss://') || r.startsWith('ws://')))
          : [];

        await createRecord(env.DB, {
          name: nameValidation.normalized,
          pubkey: auth.pubkey,
          relays: cleanRelays,
          lightning_address: lnValidation.normalized
        });

        const updatedRecord = await getRecordByPubkey(env.DB, auth.pubkey);
        return jsonResponse({ success: true, record: updatedRecord }, 201);
      }

      // 6. API: Update Profile (Relays & Lightning Address): POST /api/update (requires NIP-98 auth + Turnstile)
      if (pathname === '/api/update' && request.method === 'POST') {
        // Rate limit: Max 15 updates per minute per IP
        const rate = await checkRateLimit(env.DB, `update:${clientIp}`, 15, 60);
        if (!rate.allowed) {
          return errorResponse('Çok fazla istek gönderildi. Lütfen biraz bekleyin.', 429, {
            'Retry-After': String(rate.resetInSeconds)
          });
        }

        const auth = await verifyNip98Auth(request, 'POST');
        if (!auth.success || !auth.pubkey) {
          return errorResponse(auth.error || 'Kimlik doğrulama başarısız', 401);
        }

        let body: UpdateProfileRequest;
        try {
          body = await request.json();
        } catch {
          return errorResponse('Geçersiz JSON gövdesi', 400);
        }

        // Turnstile Bot Verification Check
        const turnstileSecret = env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
        const turnstileCheck = await verifyTurnstileToken(turnstileSecret, body.turnstile_token, clientIp);
        if (!turnstileCheck.success) {
          return errorResponse(turnstileCheck.error || 'Bot koruması doğrulaması başarısız', 403);
        }

        const existing = await getRecordByPubkey(env.DB, auth.pubkey);
        if (!existing) {
          return errorResponse('Kayıtlı kullanıcı profili bulunamadı', 404);
        }

        const lnValidation = validateLightningAddress(body.lightning_address);
        if (!lnValidation.valid) {
          return errorResponse(lnValidation.reason || 'Geçersiz Lightning adresi', 400);
        }

        const cleanRelays = Array.isArray(body.relays)
          ? body.relays.filter((r) => typeof r === 'string' && (r.startsWith('wss://') || r.startsWith('ws://')))
          : existing.relays;

        await updateRecord(env.DB, auth.pubkey, {
          relays: cleanRelays,
          lightning_address: lnValidation.normalized
        });

        const updatedRecord = await getRecordByPubkey(env.DB, auth.pubkey);
        return jsonResponse({ success: true, record: updatedRecord });
      }

      // 7. API: Delete / Release Name: POST /api/delete (requires NIP-98 auth)
      if (pathname === '/api/delete' && request.method === 'POST') {
        const rate = await checkRateLimit(env.DB, `delete:${clientIp}`, 10, 60);
        if (!rate.allowed) {
          return errorResponse('Çok fazla istek gönderildi. Lütfen biraz bekleyin.', 429);
        }

        const auth = await verifyNip98Auth(request, 'POST');
        if (!auth.success || !auth.pubkey) {
          return errorResponse(auth.error || 'Kimlik doğrulama başarısız', 401);
        }

        const existing = await getRecordByPubkey(env.DB, auth.pubkey);
        if (!existing) {
          return errorResponse('Kayıtlı kullanıcı profili bulunamadı', 404);
        }

        await deleteRecordByPubkey(env.DB, auth.pubkey);
        return jsonResponse({ success: true, message: 'Kullanıcı adı başarıyla silindi ve serbest bırakıldı' });
      }
    }

    // Fallback: Static Assets
    return env.ASSETS.fetch(request);
  }
};
