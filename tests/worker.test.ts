import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateName, validateLightningAddress, getRecentRecords } from '../src/worker/db.ts';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools';
import { verifyNip98Auth } from '../src/worker/auth.ts';
import { checkApiOrigin } from '../src/worker/origin.ts';
import { verifyTurnstileToken } from '../src/worker/turnstile.ts';
import worker from '../src/worker/index.ts';

describe('Validation Helpers', () => {
  it('validates correct usernames', () => {
    assert.equal(validateName('emre').valid, true);
    assert.equal(validateName('emre-yilmaz').valid, true);
    assert.equal(validateName('delirehberi_99').valid, true);
    assert.equal(validateName('_').valid, true);
  });

  it('rejects invalid or reserved usernames', () => {
    assert.equal(validateName('a').valid, false); // < 2 chars
    assert.equal(validateName('admin').valid, false); // reserved
    assert.equal(validateName('api').valid, false); // reserved
    assert.equal(validateName('user@name').valid, false); // invalid char @
  });

  it('validates lightning addresses', () => {
    assert.equal(validateLightningAddress('fallingwhimsy946296@getalby.com').valid, true);
    assert.equal(validateLightningAddress('delirehberi@walletofsatoshi.com').valid, true);
    assert.equal(validateLightningAddress(null).valid, true); // optional
    assert.equal(validateLightningAddress('').valid, true); // optional
    assert.equal(validateLightningAddress('invalid-address').valid, false);
  });
});

describe('API Origin & Direct Access Guard', () => {
  it('allows valid same-origin requests', () => {
    const validReq = new Request('http://localhost:8787/api/check-name', {
      headers: {
        'Origin': 'http://localhost:8787',
        'Referer': 'http://localhost:8787/'
      }
    });
    const result = checkApiOrigin(validReq, 'rehber.dev,localhost,127.0.0.1');
    assert.equal(result.valid, true);
  });

  it('rejects cross-site or untrusted origin requests', () => {
    const badReq = new Request('http://localhost:8787/api/register', {
      headers: {
        'Origin': 'http://malicious-site.com',
        'Sec-Fetch-Site': 'cross-site'
      }
    });
    const result = checkApiOrigin(badReq, 'rehber.dev,localhost,127.0.0.1');
    assert.equal(result.valid, false);
  });
});

describe('Turnstile Verification Guard', () => {
  it('rejects empty or missing tokens', async () => {
    const res1 = await verifyTurnstileToken('secret-key', null);
    assert.equal(res1.success, false);

    const res2 = await verifyTurnstileToken('secret-key', '');
    assert.equal(res2.success, false);
  });

  it('allows canonical test token with test secret', async () => {
    const testSecret = '1x0000000000000000000000000000000AA';
    const testToken = 'XXXX.DUMMY.TOKEN.XXXX';
    const res = await verifyTurnstileToken(testSecret, testToken);
    assert.equal(res.success, true);
  });
});

describe('NIP-98 Authentication', () => {
  it('validates correct NIP-98 authorization token', async () => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    const targetUrl = 'http://localhost:8787/api/register';

    const unsignedEvent = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', targetUrl],
        ['method', 'POST']
      ],
      content: ''
    };

    const signedEvent = finalizeEvent(unsignedEvent, sk);
    const token = Buffer.from(JSON.stringify(signedEvent)).toString('base64');

    const request = new Request(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Nostr ${token}`
      }
    });

    const result = await verifyNip98Auth(request, 'POST');
    assert.equal(result.success, true);
    assert.equal(result.pubkey, pk);
  });

  it('rejects expired or mismatched NIP-98 tokens', async () => {
    const sk = generateSecretKey();
    const targetUrl = 'http://localhost:8787/api/register';

    // Expired event (10 minutes ago)
    const expiredEvent = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000) - 600,
      tags: [
        ['u', targetUrl],
        ['method', 'POST']
      ],
      content: ''
    };

    const signedExpired = finalizeEvent(expiredEvent, sk);
    const expiredToken = Buffer.from(JSON.stringify(signedExpired)).toString('base64');

    const req1 = new Request(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Nostr ${expiredToken}`
      }
    });

    const res1 = await verifyNip98Auth(req1, 'POST');
    assert.equal(res1.success, false);

    // Method mismatch
    const unsignedEvent = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', targetUrl],
        ['method', 'GET']
      ],
      content: ''
    };

    const signedMismatched = finalizeEvent(unsignedEvent, sk);
    const token2 = Buffer.from(JSON.stringify(signedMismatched)).toString('base64');

    const req2 = new Request(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Nostr ${token2}`
      }
    });

    const res2 = await verifyNip98Auth(req2, 'POST');
    assert.equal(res2.success, false);
  });
});

describe('NIP-05 & nostr.json Endpoints', () => {
  const mockDb = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes('WHERE name = ?')) {
            const name = args[0] as string;
            if (name === 'emre') {
              return {
                name: 'emre',
                pubkey: 'npub_test_key_emre',
                relays: JSON.stringify(['wss://relay.damus.io']),
                lightning_address: 'emre@rehber.dev',
                created_at: 1000,
                updated_at: 1000
              };
            }
            return null;
          }
          return null;
        },
        all: async () => {
          if (sql.includes('FROM nip05_records')) {
            if (sql.includes('ORDER BY created_at DESC')) {
              return {
                results: [
                  {
                    name: 'delirehberi',
                    pubkey: 'npub_test_key_delirehberi',
                    lightning_address: null,
                    created_at: 1001
                  },
                  {
                    name: 'emre',
                    pubkey: 'npub_test_key_emre',
                    lightning_address: 'emre@rehber.dev',
                    created_at: 1000
                  }
                ]
              };
            }
            return {
              results: [
                {
                  name: 'emre',
                  pubkey: 'npub_test_key_emre',
                  relays: JSON.stringify(['wss://relay.damus.io']),
                  lightning_address: 'emre@rehber.dev',
                  created_at: 1000,
                  updated_at: 1000
                },
                {
                  name: 'delirehberi',
                  pubkey: 'npub_test_key_delirehberi',
                  relays: '[]',
                  lightning_address: null,
                  created_at: 1001,
                  updated_at: 1001
                }
              ]
            };
          }
          return { results: [] };
        },
        run: async () => ({})
      })
    })
  };

  const mockEnv = {
    DB: mockDb as any,
    ASSETS: {
      fetch: async () => new Response('SPA index.html', { status: 200, headers: { 'Content-Type': 'text/html' } })
    } as any,
    ALLOWED_HOSTS: 'rehber.dev,localhost,127.0.0.1'
  };

  const mockCtx = {
    waitUntil: () => {},
    passThroughOnException: () => {}
  } as any;

  it('serves NIP-05 response on /.well-known/nostr.json with ?name=', async () => {
    const req = new Request('http://localhost:8787/.well-known/nostr.json?name=emre', {
      method: 'GET'
    });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Content-Type'), 'application/json');

    const data = await res.json() as { names: Record<string, string>; relays?: Record<string, string[]> };
    assert.equal(data.names.emre, 'npub_test_key_emre');
    assert.deepEqual(data.relays?.['npub_test_key_emre'], ['wss://relay.damus.io']);
  });

  it('serves NIP-05 response on /nostr.json alias path', async () => {
    const req = new Request('http://localhost:8787/nostr.json?name=emre', {
      method: 'GET'
    });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    assert.equal(res.status, 200);

    const data = await res.json() as { names: Record<string, string> };
    assert.equal(data.names.emre, 'npub_test_key_emre');
  });

  it('normalizes full identifier user@domain in ?name=', async () => {
    const req = new Request('http://localhost:8787/.well-known/nostr.json?name=emre@rehber.dev', {
      method: 'GET'
    });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    assert.equal(res.status, 200);

    const data = await res.json() as { names: Record<string, string> };
    assert.equal(data.names.emre, 'npub_test_key_emre');
  });

  it('returns directory listing when no name parameter is provided', async () => {
    const req = new Request('http://localhost:8787/.well-known/nostr.json', {
      method: 'GET'
    });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    assert.equal(res.status, 200);

    const data = await res.json() as { names: Record<string, string>; relays?: Record<string, string[]> };
    assert.equal(data.names.emre, 'npub_test_key_emre');
    assert.equal(data.names.delirehberi, 'npub_test_key_delirehberi');
    assert.deepEqual(data.relays?.['npub_test_key_emre'], ['wss://relay.damus.io']);
  });

  it('returns empty names map when record is not found', async () => {
    const req = new Request('http://localhost:8787/.well-known/nostr.json?name=unknown', {
      method: 'GET'
    });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    assert.equal(res.status, 200);

    const data = await res.json() as { names: Record<string, string> };
    assert.deepEqual(data.names, {});
  });

  it('handles CORS OPTIONS preflight correctly', async () => {
    const req = new Request('http://localhost:8787/.well-known/nostr.json', {
      method: 'OPTIONS'
    });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('retrieves recent records in descending order via db helper', async () => {
    const records = await getRecentRecords(mockEnv.DB, 10);
    assert.equal(records.length, 2);
    assert.equal(records[0].name, 'delirehberi');
    assert.equal(records[0].created_at, 1001);
    assert.equal(records[1].name, 'emre');
    assert.equal(records[1].created_at, 1000);
  });

  it('serves recent 10 users on /api/recent with caching headers', async () => {
    const req = new Request('http://localhost:8787/api/recent', {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:8787'
      }
    });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'application/json');
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=15, s-maxage=30');

    const data = await res.json() as { success: boolean; users: Array<{ name: string; pubkey: string; created_at: number }> };
    assert.equal(data.success, true);
    assert.equal(data.users.length, 2);
    assert.equal(data.users[0].name, 'delirehberi');
    assert.equal(data.users[1].name, 'emre');
  });
});


