# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

---

## Security Architecture & Defenses

**rehber.dev** employs defense-in-depth security principles tailored to edge serverless environments:

1. **NIP-98 Cryptographic Authentication**:
   - All state-changing mutations (`/api/register`, `/api/update`, `/api/delete`) require signed HTTP request headers (`kind: 27235`) matching the targeted URL and HTTP method.
   - Timestamp freshness is enforced (window of 120 seconds) to prevent replay attacks.
   - No passwords, private keys, or long-lived server sessions are stored or processed.

2. **Bot & Abuse Deterrence (Cloudflare Turnstile)**:
   - Registration and updates require verified Turnstile tokens validated on the Cloudflare Worker edge.

3. **Origin & Direct Access Guards**:
   - Mutation APIs check `Origin`, `Referer`, and `Sec-Fetch-Site` to prevent cross-site misuse.

4. **Sliding Window Rate Limiting**:
   - IP-based rate limiting persisted directly in Cloudflare D1 with automatic cleanup.

5. **SQL Injection Prevention**:
   - All database queries use Cloudflare D1 parameterized prepared statements.

---

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please report it responsibly:

- **Email**: [security@rehber.dev](mailto:security@rehber.dev) or [admin@rehber.dev](mailto:admin@rehber.dev)
- **Nostr**: You can also reach out via encrypted direct message (NIP-04 / NIP-17) to `@delirehberi` / `npub10el4608c028r6gsl66m3p3wt29d0e2d5t930y34sl0t8k0lmsyhq8sylx3`.

Please include:
- A description of the vulnerability.
- Steps or proof-of-concept to reproduce the issue.
- Potential impact.

We will acknowledge receipt within 48 hours and work with you on a coordinated disclosure.
