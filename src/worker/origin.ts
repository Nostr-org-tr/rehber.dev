export interface OriginCheckResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates request origin to prevent unauthorized direct or cross-origin API abuse
 */
export function checkApiOrigin(request: Request, allowedHostsConfig?: string): OriginCheckResult {
  const allowedHosts = new Set(
    (allowedHostsConfig || 'rehber.dev,localhost,127.0.0.1')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean)
  );

  const reqUrl = new URL(request.url);
  const reqHost = reqUrl.hostname.toLowerCase();

  // Allow same-host request if within allowed hosts
  if (allowedHosts.has(reqHost)) {
    // Check Origin or Referer if present
    const originHeader = request.headers.get('origin');
    const refererHeader = request.headers.get('referer');
    const secFetchSite = request.headers.get('sec-fetch-site');

    // If sec-fetch-site is explicitly cross-site, reject
    if (secFetchSite && secFetchSite === 'cross-site') {
      return { valid: false, reason: 'Çapraz kaynak (cross-site) isteklerine izin verilmez' };
    }

    if (originHeader) {
      try {
        const originUrl = new URL(originHeader);
        if (!allowedHosts.has(originUrl.hostname.toLowerCase())) {
          return { valid: false, reason: `Yetkisiz Origin: ${originUrl.hostname}` };
        }
      } catch {
        return { valid: false, reason: 'Geçersiz Origin başlığı' };
      }
    }

    if (refererHeader) {
      try {
        const refUrl = new URL(refererHeader);
        if (!allowedHosts.has(refUrl.hostname.toLowerCase())) {
          return { valid: false, reason: `Yetkisiz Referer: ${refUrl.hostname}` };
        }
      } catch {
        return { valid: false, reason: 'Geçersiz Referer başlığı' };
      }
    }

    return { valid: true };
  }

  return { valid: false, reason: 'Bilinmeyen veya yetkisiz sunucu adresi' };
}
