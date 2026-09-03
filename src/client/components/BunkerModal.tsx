import React, { useState } from 'react';
import { X, Puzzle, Server, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { connectExtension, connectBunker, type NostrSigner } from '../nostr/auth';

interface BunkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (signer: NostrSigner, pubkey: string) => void;
}

export const BunkerModal: React.FC<BunkerModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [activeMode, setActiveMode] = useState<'extension' | 'bunker'>('extension');
  const [bunkerUri, setBunkerUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExtensionLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { signer, pubkey } = await connectExtension();
      onSuccess(signer, pubkey);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eklentiye bağlanılamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleBunkerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bunkerUri.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const { signer, pubkey } = await connectBunker(bunkerUri);
      onSuccess(signer, pubkey);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bunker bağlantısı kurulamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-neutral-200 text-left relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-neutral-900 mb-1">Nostr ile Giriş Yap</h3>
        <p className="text-xs text-neutral-500 mb-6">
          Şifresiz, güvenli ve merkeziyetsiz giriş yönteminizi seçin.
        </p>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveMode('extension');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeMode === 'extension'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Puzzle className="w-4 h-4 text-purple-600" />
            <span>Tarayıcı Eklentisi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('bunker');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeMode === 'bunker'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Server className="w-4 h-4 text-indigo-600" />
            <span>Nostr Bunker</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {activeMode === 'extension' ? (
          <div className="space-y-4">
            <p className="text-xs text-neutral-600 leading-relaxed">
              Tarayıcınızda yüklü olan <strong>Alby, nos2x, Blockcore</strong> veya uyumlu herhangi bir NIP-07 Nostr eklentisiyle tek tıkla oturum açın.
            </p>
            <button
              type="button"
              onClick={handleExtensionLogin}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-md shadow-purple-200 transition flex items-center justify-center gap-2 disabled:bg-neutral-300"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Bağlanılıyor...</span>
                </>
              ) : (
                <>
                  <span>Eklentiyle Bağlan</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleBunkerLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                Bunker Bağlantı Adresi (URI)
              </label>
              <input
                type="text"
                value={bunkerUri}
                onChange={(e) => setBunkerUri(e.target.value)}
                placeholder="bunker://... veya kullanici@bunker.com"
                className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-xs font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !bunkerUri.trim()}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 disabled:bg-neutral-300"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Bunker'a Bağlanılıyor...</span>
                </>
              ) : (
                <>
                  <span>Bunker ile Bağlan</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
