export interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
}

/**
 * Verifies a Cloudflare Turnstile token server-side via siteverify
 */
export async function verifyTurnstileToken(
  secretKey: string,
  token: string | null | undefined,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return { success: false, error: 'Turnstile güvenlik doğrulaması eksik' };
  }

  // Cloudflare canonical dummy test keys pass automatically in test mode
  if (secretKey === '1x0000000000000000000000000000000AA' && token.startsWith('XXXX.')) {
    return { success: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData,
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      return { success: false, error: `Turnstile doğrulama servisi hatası (${res.status})` };
    }

    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      const errorCodes = data['error-codes']?.join(', ') || 'Doğrulama başarısız';
      return { success: false, error: `Bot koruması reddetti: ${errorCodes}` };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `Turnstile bağlantı hatası: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}
