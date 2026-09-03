import type { D1Database } from '@cloudflare/workers-types';
import { getRecordByName } from './db';
import type { LnurlPayResponse } from '../shared/types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json'
};

export async function handleLnurlPay(db: D1Database, name: string): Promise<Response> {
  const record = await getRecordByName(db, name);
  if (!record || !record.lightning_address) {
    return new Response(
      JSON.stringify({
        status: 'ERROR',
        reason: `rehber.dev üzerinde '${name}' için kayıtlı bir Lightning adresi bulunamadı.`
      }),
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const [lnUsername, lnDomain] = record.lightning_address.split('@');
  if (!lnUsername || !lnDomain) {
    return new Response(
      JSON.stringify({
        status: 'ERROR',
        reason: 'Kayıtlı Lightning adresi geçersiz formatta.'
      }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const upstreamUrl = `https://${lnDomain}/.well-known/lnurlp/${encodeURIComponent(lnUsername)}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'rehber.dev-LNURL-Proxy/1.0'
      }
    });

    if (!upstreamRes.ok) {
      return new Response(
        JSON.stringify({
          status: 'ERROR',
          reason: `Hedef Lightning sağlayıcısından (${lnDomain}) yanıt alınamadı (HTTP ${upstreamRes.status}).`
        }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const upstreamData = (await upstreamRes.json()) as LnurlPayResponse;

    // Inject or update Nostr zap parameters
    upstreamData.nostrPubkey = record.pubkey;
    upstreamData.allowsNostr = true;

    return new Response(JSON.stringify(upstreamData), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'public, max-age=30, s-maxage=60'
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: 'ERROR',
        reason: `Lightning yönlendirmesi sırasında hata oluştu: ${err instanceof Error ? err.message : String(err)}`
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
