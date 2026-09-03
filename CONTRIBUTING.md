# Contributing to rehber.dev

Thank you for your interest in contributing to **rehber.dev**! We welcome contributions, bug reports, feature requests, and improvements from the community.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version `22` (Use [nvm](https://github.com/nvm-sh/nvm): `nvm use`)
- **npm**: Version `10+`
- **Cloudflare Wrangler CLI**: Included in `devDependencies`
- **Make**: For simplified workflow automation

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/delirehberi/rehber.dev.git
   cd rehber.dev
   ```

2. **Set up Node.js version**:
   ```bash
   nvm use
   ```

3. **Install dependencies**:
   ```bash
   make install
   ```

4. **Initialize local SQLite / D1 database**:
   ```bash
   make db-init-local
   ```

5. **Start local development server**:
   ```bash
   make dev
   ```
   This launches the Cloudflare Worker with local D1 bindings and Vite asset serving at `http://localhost:8787`.

---

## 🧪 Testing & Quality Checks

Before submitting a Pull Request, always ensure tests pass and builds complete without errors:

```bash
# Run unit tests
make test

# Build frontend and perform Worker TypeScript type checking
make build
```

---

## 📐 Code Guidelines

- **Clean & Typed**: Write type-safe code for both React frontend and Cloudflare Worker backend.
- **No Hardcoded Secrets**: Never commit API keys, private keys (`nsec`), or sensitive tokens.
- **NIP Compliance**: Strictly follow [Nostr Implementation Possibilities (NIPs)](https://github.com/nostr-protocol/nips), especially NIP-05, NIP-07, NIP-46, and NIP-98.
- **Security Guardrails**: Maintain Cloudflare Turnstile token validation and origin checks on sensitive POST endpoints.

---

## 🌿 Git Workflow

1. Fork the repository on GitHub.
2. Create a feature or fix branch from `master`:
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. Commit your changes using descriptive commit messages:
   ```bash
   git commit -m "feat: add support for custom relay presets"
   ```
4. Push your branch to your fork:
   ```bash
   git push origin feature/my-new-feature
   ```
5. Open a Pull Request on GitHub targeting `master`.

---

## 📜 Code of Conduct

Please note that this project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.
