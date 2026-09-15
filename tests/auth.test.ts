import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import {
  parseNsecInput,
  isValidNsec,
  connectNsec,
  createNip98AuthHeader
} from '../src/client/nostr/auth.ts';
import { verifyNip98Auth } from '../src/worker/auth.ts';

describe('Nostr nsec & Hex Secret Key Parsing', () => {
  it('parses valid nsec1... bech32 keys correctly', () => {
    const rawSecret = generateSecretKey();
    const nsec = nip19.nsecEncode(rawSecret);

    const parsed = parseNsecInput(nsec);
    assert.deepEqual(parsed, rawSecret);
    assert.equal(isValidNsec(nsec), true);
  });

  it('parses valid nsec1... with surrounding whitespace', () => {
    const rawSecret = generateSecretKey();
    const nsec = nip19.nsecEncode(rawSecret);

    const parsed = parseNsecInput(`  ${nsec}  \n`);
    assert.deepEqual(parsed, rawSecret);
    assert.equal(isValidNsec(`  ${nsec}  \n`), true);
  });

  it('parses 64-character hex private keys correctly', () => {
    const rawSecret = generateSecretKey();
    const hex = Array.from(rawSecret)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const parsed = parseNsecInput(hex);
    assert.deepEqual(parsed, rawSecret);
    assert.equal(isValidNsec(hex), true);
  });

  it('rejects empty or whitespace-only inputs', () => {
    assert.throws(() => parseNsecInput(''), /Özel anahtar boş bırakılamaz/);
    assert.throws(() => parseNsecInput('   '), /Özel anahtar boş bırakılamaz/);
    assert.equal(isValidNsec(''), false);
  });

  it('rejects npub1... public keys passed as secret keys', () => {
    const rawSecret = generateSecretKey();
    const pubkey = getPublicKey(rawSecret);
    const npub = nip19.npubEncode(pubkey);

    assert.throws(() => parseNsecInput(npub), /Geçersiz özel anahtar formatı/);
    assert.equal(isValidNsec(npub), false);
  });

  it('rejects invalid hex strings', () => {
    assert.throws(() => parseNsecInput('1234abcd'), /Geçersiz özel anahtar formatı/);
    assert.throws(() => parseNsecInput('zz'.repeat(32)), /Geçersiz özel anahtar formatı/);
    assert.equal(isValidNsec('1234abcd'), false);
  });

  it('rejects malformed nsec strings', () => {
    assert.throws(() => parseNsecInput('nsec1invalidpayload'), /Geçersiz nsec formatı/);
    assert.equal(isValidNsec('nsec1invalidpayload'), false);
  });
});

describe('Nostr nsec Signer & NIP-98 Authentication', () => {
  it('connects via nsec and derives the correct pubkey', async () => {
    const rawSecret = generateSecretKey();
    const nsec = nip19.nsecEncode(rawSecret);
    const expectedPubkey = getPublicKey(rawSecret);

    const { signer, pubkey } = connectNsec(nsec);
    assert.equal(pubkey, expectedPubkey);
    assert.equal(signer.type, 'nsec');
    assert.equal(signer.nsec, nsec);
    assert.equal(await signer.getPublicKey(), expectedPubkey);
  });

  it('signs events using connectNsec signer and verifies with worker verifyNip98Auth', async () => {
    const rawSecret = generateSecretKey();
    const nsec = nip19.nsecEncode(rawSecret);
    const { signer, pubkey } = connectNsec(nsec);

    const testUrl = 'https://rehber.dev/api/profile';
    const authHeader = await createNip98AuthHeader(testUrl, 'GET', signer);

    assert.ok(authHeader.startsWith('Nostr '));

    const request = new Request(testUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader
      }
    });

    const result = await verifyNip98Auth(request, 'GET');
    assert.equal(result.success, true);
    assert.equal(result.pubkey, pubkey);
  });

  it('signs requests for POST /api/register and verifies method matching', async () => {
    const rawSecret = generateSecretKey();
    const nsec = nip19.nsecEncode(rawSecret);
    const { signer, pubkey } = connectNsec(nsec);

    const testUrl = 'https://rehber.dev/api/register';
    const authHeader = await createNip98AuthHeader(testUrl, 'POST', signer);

    const request = new Request(testUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader
      }
    });

    const result = await verifyNip98Auth(request, 'POST');
    assert.equal(result.success, true);
    assert.equal(result.pubkey, pubkey);

    // Method mismatch test
    const mismatchResult = await verifyNip98Auth(request, 'DELETE');
    assert.equal(mismatchResult.success, false);
    assert.ok(mismatchResult.error?.includes('HTTP method uyuşmazlığı'));
  });
});
