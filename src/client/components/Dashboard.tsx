import React, { useState } from 'react';
import {
  Check,
  Copy,
  Zap,
  ShieldCheck,
  Globe,
  Plus,
  X,
  Loader2,
  Trash2,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import type { NostrSigner } from '../nostr/auth';
import { createNip98AuthHeader, formatNpub, shortenKey } from '../nostr/auth';
import type { Nip05Record } from '../../shared/types';
import { TurnstileWidget } from './TurnstileWidget';

interface DashboardProps {
  record: Nip05Record;
  signer: NostrSigner | null;
  turnstileSiteKey?: string;
  onUpdate: (record: Nip05Record) => void;
  onDelete: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  record,
  signer,
  turnstileSiteKey,
  onUpdate,
  onDelete
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [lightningAddress, setLightningAddress] = useState(record.lightning_address || '');
  const [relays, setRelays] = useState<string[]>(record.relays || []);
  const [customRelay, setCustomRelay] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [activeGuideTab, setActiveGuideTab] = useState<'primal' | 'damus' | 'amethyst'>('primal');

  const nip05Identifier = `${record.name}@rehber.dev`;
  const npub = formatNpub(record.pubkey);

  const handleCopyIdentifier = () => {
    navigator.clipboard.writeText(nip05Identifier);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleAddRelay = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customRelay.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('wss://') && !trimmed.startsWith('ws://')) {
      alert('Röle adresi wss:// veya ws:// ile başlamalıdır.');
      return;
    }
    if (!relays.includes(trimmed)) {
      setRelays([...relays, trimmed]);
    }
    setCustomRelay('');
  };

  const handleRemoveRelay = (r: string) => {
    setRelays(relays.filter((item) => item !== r));
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) return;

    if (!turnstileToken) {
      setSaveError('Lütfen bot koruması doğrulamasını bekleyin.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const url = `${window.location.origin}/api/update`;
      const authHeader = await createNip98AuthHeader(url, 'POST', signer);

      const res = await fetch('/api/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          relays,
          lightning_address: lightningAddress.trim() || null,
          turnstile_token: turnstileToken
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Güncelleme kaydedilemedi');
      }

      onUpdate(data.record);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteName = async () => {
    if (!signer) return;

    setDeleting(true);
    try {
      const url = `${window.location.origin}/api/delete`;
      const authHeader = await createNip98AuthHeader(url, 'POST', signer);

      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kayıt silinemedi');
      }

      onDelete();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silme işlemi başarısız oldu');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto text-left">
      {/* Active Identity Hero Card */}
      <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-neutral-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-purple-200 border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>NIP-05 Doğrulanmış Kimlik</span>
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              {shortenKey(npub)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10">
            <div>
              <p className="text-2xs uppercase tracking-wider text-purple-200 font-semibold mb-1">
                Nostr ve Lightning Adresiniz
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                {nip05Identifier}
              </h2>
            </div>

            <button
              onClick={handleCopyIdentifier}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-neutral-900 font-bold text-xs hover:bg-neutral-100 active:scale-95 transition shadow-sm"
            >
              {copiedId ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-neutral-600" />
                  <span>Adresi Kopyala</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Settings Card */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-6 sm:p-8">
        <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <span>Adres ve Röle Ayarları</span>
        </h3>

        <form onSubmit={handleSaveChanges} className="space-y-6">
          {/* Lightning Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span>Lightning / Zap Yönlendirici (Opsiyonel)</span>
            </label>
            <p className="text-xs text-neutral-500 mb-2">
              <code>{nip05Identifier}</code> adresine gönderilen Satoshi ve Nostr Zap'lerinin aktarılacağı Alby veya WalletOfSatoshi adresi:
            </p>
            <input
              type="text"
              value={lightningAddress}
              onChange={(e) => setLightningAddress(e.target.value.trim().toLowerCase())}
              placeholder="ornek: kullanici@getalby.com veya ad@walletofsatoshi.com"
              className="w-full rounded-2xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
            />
          </div>

          {/* Relays */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span>NIP-05 Röle Listeniz (Relays)</span>
            </label>

            <div className="flex flex-wrap gap-2 mb-3">
              {relays.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono bg-neutral-100 text-neutral-800 border border-neutral-200"
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
                onClick={handleAddRelay}
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
              action="update"
              onSuccess={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken(null)}
            />
          </div>

          {saveError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{saveError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Ayarlarınız başarıyla güncellendi!</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
            <button
              type="submit"
              disabled={saving || !turnstileToken}
              className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm shadow-purple-200 transition flex items-center gap-2 disabled:bg-neutral-300"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <span>Değişiklikleri Kaydet</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl transition flex items-center gap-1.5 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Adresi Sil / Bırak</span>
            </button>
          </div>
        </form>
      </div>

      {/* Setup Guide for Clients */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-purple-600" />
          <h3 className="text-base sm:text-lg font-bold text-neutral-900">
            Nostr Uygulamanıza Nasıl Eklenir?
          </h3>
        </div>

        {/* Client Tabs */}
        <div className="flex gap-2 mb-4 border-b border-neutral-100 pb-2">
          {(['primal', 'damus', 'amethyst'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveGuideTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition capitalize ${
                activeGuideTab === tab
                  ? 'bg-purple-100 text-purple-800'
                  : 'text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Step-by-step content */}
        <div className="space-y-3 text-xs sm:text-sm text-neutral-600">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <p className="font-semibold text-neutral-900">Profil Ayarlarınıza Gidin</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {activeGuideTab === 'primal' && 'Primal uygulamasında sol menüden Profilinize tıklayın ve "Edit Profile" seçeneğine basın.'}
                {activeGuideTab === 'damus' && 'Damus uygulamasında sol üstteki avatarınıza dokunun ve "Edit Profile" seçin.'}
                {activeGuideTab === 'amethyst' && 'Amethyst uygulamasında Profil sayfanızı açın ve "Profili Düzenle" butonuna dokunun.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <p className="font-semibold text-neutral-900">NIP-05 Alanını Doldurun</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                <strong>NIP-05 Doğrulama</strong> alanına <code className="bg-white px-1.5 py-0.5 rounded border border-neutral-200 font-mono text-purple-700 font-semibold">{nip05Identifier}</code> adresini yapıştırın.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <p className="font-semibold text-neutral-900">Kaydedin ve Rozetinizi Görün</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Kaydettikten sonra profilinizde <strong>mor onay rozeti</strong> ve <code>{nip05Identifier}</code> görünecektir!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 text-left">
            <h4 className="text-base font-bold text-neutral-900 mb-2">
              Kullanıcı Adınızı Silmek İstiyor musunuz?
            </h4>
            <p className="text-xs text-neutral-600 mb-6">
              <code>{nip05Identifier}</code> kaydınız silinecektir ve kullanıcı adı başkaları tarafından alınabilir hale gelecektir.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDeleteName}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition flex items-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Evet, Sil</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
