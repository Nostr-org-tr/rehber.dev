import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateName, validateLightningAddress } from '../src/worker/db.ts';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools';
import { verifyNip98Auth } from '../src/worker/auth.ts';
import { checkApiOrigin } from '../src/worker/origin.ts';
import { verifyTurnstileToken } from '../src/worker/turnstile.ts';

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
