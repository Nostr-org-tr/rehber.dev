# rehber.dev - Nostr NIP-05 & Lightning Address (LNURL-pay) Service

[![CI](https://github.com/delirehberi/rehber.dev/actions/workflows/ci.yml/badge.svg)](https://github.com/delirehberi/rehber.dev/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](package.json)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%26%20D1-orange)](https://workers.cloudflare.com/)

Cloudflare Workers ve Cloudflare D1 üzerinde çalışan, Nostr kullanıcılarının `adiniz@rehber.dev` şeklinde doğrulanmış NIP-05 kimliği almasını sağlayan ve aynı zamanda bu adresi Alby / WalletOfSatoshi hesaplarına bağlayarak Satoshi ve Nostr Zap yönlendirmesi (LUD-16) yapan hafif, hızlı ve modern bir açık kaynak servisidir.

---

## 🚀 Özellikler

- **NIP-05 Doğrulama**: `GET /.well-known/nostr.json?name=<ad>` (Damus, Amethyst, Primal vb. istemcilerde mor onay rozeti).
- **Lightning Adres & Zap Yönlendirme (LUD-16)**: `GET /.well-known/lnurlp/<ad>` (Alby ve Wallet of Satoshi adreslerini upstream çözümleyerek Nostr Zap'lerini `nostrPubkey` ile yönlendirir).
- **NIP-98 Güvenli Kimlik Doğrulama**: Parolasız, e-postasız; yalnızca Nostr açık/gizli anahtarı ile imzalanan HTTP istekleri (`kind: 27235`).
- **NIP-07 & NIP-46 Girişi**: Tarayıcı eklentileri (Alby, nos2x) ve Nostr Bunker bağlantısı.
- **Röle (Relay) Yönetimi**: Kullanıcının istediği röleleri listelemesi ve tek tıkla güncellemesi.
- **Bot ve Spam Koruması**: Cloudflare Turnstile ve Edge tabanlı IP hız sınırlaması (Rate Limiting).
- **Yalın Türkçe Arayüz**: Son kullanıcıya hitap eden açık tema, sade anlatım ve `nostr.org.tr` başlangıç yönlendirmesi.

---

## 🏗️ Mimari ve Güvenlik

```text
[ Nostr İstemcileri & Zapper'lar ]       [ Web Tarayıcısı / Ziyaretçi ]
               │                                      │
               │ (NIP-05 / LUD-16 LNURL)              │ (React SPA + NIP-07/46/98 + Turnstile)
               ▼                                      ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                 Cloudflare Workers (Edge Gateway)                │
   │  - Origin & Turnstile Token Doğrulama                            │
   │  - NIP-98 Kriptografik İmza Doğrulama                            │
   │  - Upstream LNURL-pay / Zap Proxying                             │
   │  - Sliding-Window Rate Limiting                                  │
   └───────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                   Cloudflare D1 (Serverless SQL)                 │
   │  - `nip05_records` (Kullanıcı Adı, Pubkey, Röleler, LN Adresi)    │
   │  - `rate_limits` (IP bazlı istek sayacı & temizleme)             │
   └──────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Geliştirici & Makefile Komutları

Geliştirme, test ve dağıtım süreçleri için `Makefile` hazırlandı:

```bash
make help            # Mevcut komutları ve açıklamalarını listeler
make install         # Bağımlılıkları yükler
make dev             # Wrangler ile tam geliştirme sunucusunu (Worker + D1 + Assets) başlatır
make dev-frontend    # Yalnızca Vite React arayüz sunucusunu başlatır
make test            # Otomatik testleri çalıştırır
make build           # Frontend'i derler ve Worker tip kontrollerini yapar
make db-init-local   # Yerel Cloudflare D1 şemasını uygular
make db-init-remote  # Canlı (remote) Cloudflare D1 şemasını uygular
make deploy          # Projeyi derleyip Cloudflare Worker'a canlıya alır
make clean           # Derleme çıktılarını temizler
```

---

## 📖 Uç Noktalar (Endpoints)

| Metot | Yol | Doğrulama | Açıklama |
|---|---|---|---|
| `GET` | `/.well-known/nostr.json?name=<ad>` | Yok (Açık) | NIP-05 kimlik ve röle sorgulama |
| `GET` | `/.well-known/lnurlp/<ad>` | Yok (Açık) | LUD-16 Lightning payRequest ve Zap çözümleme |
| `GET` | `/api/check-name?name=<ad>` | Yok (Açık) | Kullanıcı adı uygunluk ve müsaitlik kontrolü |
| `GET` | `/api/profile?pubkey=<pubkey>` | Yok (Açık) | Kayıtlı profil bilgilerini getirme |
| `POST` | `/api/register` | NIP-98 + Turnstile | Yeni NIP-05 & Lightning kaydı |
| `POST` | `/api/update` | NIP-98 + Turnstile | Röle ve Lightning adresi güncelleme |
| `POST` | `/api/delete` | NIP-98 | Kaydı silme ve kullanıcı adını serbest bırakma |

---

## 🌐 Kendi Alan Adınızda Barındırma (Self-Hosting)

Bu projeyi kendi alan adınız (domain) üzerinde çalıştırmak için:

1. **Depoyu klonlayın ve bağımlılıkları yükleyin**:
   ```bash
   git clone https://github.com/delirehberi/rehber.dev.git
   cd rehber.dev
   nvm use
   make install
   ```

2. **Cloudflare D1 Veritabanı Oluşturun**:
   ```bash
   npx wrangler d1 create rehber-nip05-db
   ```
   Çıktıdaki `database_id` değerini `wrangler.jsonc` dosyasındaki `database_id` alanına yazın.

3. **Veritabanı Şemasını Uygulayın**:
   ```bash
   make db-init-remote
   ```

4. **Turnstile ve İzin Verilen Host Değişkenlerini Ayarlayın**:
   - `wrangler.jsonc` içindeki `vars.TURNSTILE_SITE_KEY` ve `vars.ALLOWED_HOSTS` alanlarını alan adınıza göre güncelleyin.
   - Gizli anahtarı Cloudflare Worker secrets olarak ekleyin:
     ```bash
     npx wrangler secret put TURNSTILE_SECRET_KEY
     ```

5. **Canlıya Dağıtın**:
   ```bash
   make deploy
   ```

---

## 🤝 Katkıda Bulunma ve Topluluk

- Katkı rehberi için [CONTRIBUTING.md](CONTRIBUTING.md) belgesini inceleyin.
- Topluluk kurallarımız için [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) belgesine göz atın.
- Güvenlik bildirimleri ve politikası için [SECURITY.md](SECURITY.md) belgesini okuyun.

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında sunulmaktadır.
