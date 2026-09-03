import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Loader2, Zap, Plus, X, Shield, ArrowRight } from 'lucide-react';
import type { NostrSigner } from '../nostr/auth';
import { createNip98AuthHeader } from '../nostr/auth';
import type { Nip05Record } from '../../shared/types';
import { TurnstileWidget } from './TurnstileWidget';

interface RegisterFormProps {
  pubkey: string | null;
  signer: NostrSigner | null;
  turnstileSiteKey?: string;
  onOpenLogin: () => void;
  onSuccess: (record: Nip05Record) => void;
}

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.nostr.band'
];

export const RegisterForm: React.FC<RegisterFormProps> = ({
  pubkey,
  signer,
  turnstileSiteKey,
  onOpenLogin,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [selectedRelays, setSelectedRelays] = useState<string[]>(DEFAULT_RELAYS);
  const [customRelay, setCustomRelay] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const [checkingName, setCheckingName] = useState(false);
  const [nameStatus, setNameStatus] = useState<{ available?: boolean; error?: string } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Debounced check username availability
  useEffect(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) {
      setNameStatus(null);
      return;
    }

    if (trimmed.length < 2) {
      setNameStatus({ error: 'En az 2 karakter olmalıdır' });
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingName(true);
      try {
        const res = await fetch(`/api/check-name?name=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.available) {
          setNameStatus({ available: true });
        } else {
          setNameStatus({ available: false, error: data.reason || 'Bu kullanıcı adı uygun değil' });
        }
      } catch {
        setNameStatus({ error: 'Sorgulama yapılamadı' });
      } finally {
        setCheckingName(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [name]);

  const handleToggleRelay = (relay: string) => {
    setSelectedRelays((prev) =>
      prev.includes(relay) ? prev.filter((r) => r !== relay) : [...prev, relay]
    );
  };

  const handleAddCustomRelay = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customRelay.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('wss://') && !trimmed.startsWith('ws://')) {
      alert('Röle adresi wss:// veya ws:// ile başlamalıdır.');
      return;
    }
    if (!selectedRelays.includes(trimmed)) {
      setSelectedRelays((prev) => [...prev, trimmed]);
    }
    setCustomRelay('');
  };

  const handleRemoveRelay = (relay: string) => {
    setSelectedRelays((prev) => prev.filter((r) => r !== relay));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!pubkey || !signer) {
      onOpenLogin();
      return;
    }

    const trimmedName = name.trim().toLowerCase();
    if (!trimmedName || nameStatus?.available !== true) {
      setSubmitError('Lütfen geçerli ve boşta olan bir kullanıcı adı seçin.');
      return;
    }

    if (!turnstileToken) {
      setSubmitError('Lütfen bot koruması doğrulamasını tamamlayın.');
      return;
    }

    setSubmitting(true);
    try {
      const url = `${window.location.origin}/api/register`;
      const authHeader = await createNip98AuthHeader(url, 'POST', signer);

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          name: trimmedName,
          relays: selectedRelays,
          lightning_address: lightningAddress.trim() || null,
          turnstile_token: turnstileToken
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kayıt işlemi başarısız oldu.');
      }

      onSuccess(data.record);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6 sm:p-8 max-w-xl mx-auto">
      <div className="mb-6 text-left">
        <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
          <span>Adresinizi Oluşturun</span>
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          İstediğiniz kullanıcı adını seçin ve hemen rehber.dev kimliğinizi tanımlayın.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-left">
        {/* Username input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
            Kullanıcı Adınız
          </label>
          <div className="relative flex rounded-2xl border border-neutral-300 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 transition overflow-hidden bg-neutral-50/50">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-_.]/g, ''))}
              placeholder="ornek: emre"
              className="w-full bg-transparent px-4 py-3 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              required
            />
            <div className="flex items-center px-4 bg-neutral-100/80 border-l border-neutral-200 text-xs sm:text-sm font-semibold text-neutral-600 select-none">
              @rehber.dev
            </div>
          </div>

          {/* Status feedback */}
          <div className="mt-2 min-h-5 flex items-center text-xs">
            {checkingName && (
              <span className="flex items-center gap-1.5 text-neutral-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Kontrol ediliyor...
              </span>
            )}
            {!checkingName && nameStatus?.available === true && (
              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <Check className="w-4 h-4 text-emerald-600" />
                <span><strong>{name.trim().toLowerCase()}@rehber.dev</strong> kullanılabilir!</span>
              </span>
            )}
            {!checkingName && nameStatus?.error && (
              <span className="flex items-center gap-1.5 text-red-600 font-medium">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{nameStatus.error}</span>
              </span>
            )}
          </div>
        </div>

        {/* Optional Lightning Address */}
        <div className="pt-2 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span>Lightning Adresiniz</span>
              <span className="text-neutral-400 text-2xs lowercase font-normal">(Opsiyonel)</span>
            </label>
          </div>
          <p className="text-xs text-neutral-500 mb-2">
            Alby veya Wallet of Satoshi adresinizi yazarak gelen Satoshi/Zap ödemelerini yönlendirebilirsiniz.
          </p>

          <input
            type="text"
            value={lightningAddress}
            onChange={(e) => setLightningAddress(e.target.value.trim().toLowerCase())}
            placeholder="ornek: kullanici@getalby.com veya ad@walletofsatoshi.com"
            className="w-full rounded-2xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition bg-neutral-50/50"
          />

          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                if (!lightningAddress.includes('@')) {
                  setLightningAddress((prev) => (prev ? `${prev}@getalby.com` : 'kullanici@getalby.com'));
                }
              }}
              className="text-2xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition"
            >
              + @getalby.com
            </button>
            <button
              type="button"
              onClick={() => {
                if (!lightningAddress.includes('@')) {
                  setLightningAddress((prev) => (prev ? `${prev}@walletofsatoshi.com` : 'kullanici@walletofsatoshi.com'));
                }
              }}
              className="text-2xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition"
            >
              + @walletofsatoshi.com
            </button>
          </div>
        </div>

        {/* Relays Management */}
        <div className="pt-2 border-t border-neutral-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
            Tanımlı Röleler (Relays)
          </label>
          <p className="text-xs text-neutral-500 mb-3">
            NIP-05 sorgusunda istemcilerinize sunulacak olan röle listesi:
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {selectedRelays.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono bg-purple-50 text-purple-700 border border-purple-200"
              >
                <span>{r.replace('wss://', '')}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveRelay(r)}
                  className="hover:text-red-600 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customRelay}
              onChange={(e) => setCustomRelay(e.target.value)}
              placeholder="wss://ozel-role-adresi.com"
              className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-xs font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={handleAddCustomRelay}
              className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ekle</span>
            </button>
          </div>
        </div>

        {/* Turnstile Bot Protection Widget */}
        <div className="pt-2 border-t border-neutral-100">
          <TurnstileWidget
            siteKey={turnstileSiteKey}
            action="register"
            onSuccess={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken(null)}
          />
        </div>

        {submitError && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Submit or Connect Button */}
        <div>
          {pubkey ? (
            <button
              type="submit"
              disabled={submitting || nameStatus?.available !== true || !turnstileToken}
              className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md shadow-purple-200 transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Nostr ile İmzalanıyor...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Adresi Kaydet & NIP-05 Al</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full py-3.5 px-4 rounded-2xl bg-neutral-900 hover:bg-black text-white text-sm font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Önce Nostr ile Giriş Yap</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
