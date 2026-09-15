import React, { useState, useEffect, useCallback } from 'react';
import { Users, Zap, ExternalLink, Copy, Check, RotateCw, Loader2, Sparkles } from 'lucide-react';
import type { RecentUser, RecentUsersResponse } from '../../shared/types';
import { formatNpub, shortenKey } from '../nostr/auth';

interface RecentRegistrationsProps {
  refreshTrigger?: number;
}

function formatRelativeTime(timestampSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestampSeconds);

  if (diff < 60) {
    return 'az önce';
  }
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) {
    return `${minutes} dk önce`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} sa önce`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} gün önce`;
  }

  const date = new Date(timestampSeconds * 1000);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export const RecentRegistrations: React.FC<RecentRegistrationsProps> = ({ refreshTrigger = 0 }) => {
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedPubkey, setCopiedPubkey] = useState<string | null>(null);

  const fetchRecentUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recent');
      if (!res.ok) {
        throw new Error('Son kayıtlar yüklenirken bir hata oluştu');
      }
      const data = (await res.json()) as RecentUsersResponse;
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bağlantı hatası';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentUsers();
  }, [fetchRecentUsers, refreshTrigger]);

  const handleCopyNpub = (pubkey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const npub = formatNpub(pubkey);
    navigator.clipboard.writeText(npub);
    setCopiedPubkey(pubkey);
    setTimeout(() => {
      setCopiedPubkey(null);
    }, 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-6 sm:p-8 max-w-4xl mx-auto text-left">
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                Son Alınan Kullanıcı Adları
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-purple-100 text-purple-700">
                Son 10
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              rehber.dev üzerinde NIP-05 ve Lightning adresini ayırtan en son kullanıcılar
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchRecentUsers()}
          disabled={loading}
          aria-label="Listeyi Yenile"
          title="Listeyi Yenile"
          className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
        </button>
      </div>

      {loading && users.length === 0 ? (
        <div className="p-8 flex flex-col items-center justify-center gap-3 text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          <span className="text-xs font-medium">Son kayıtlar yükleniyor...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchRecentUsers()}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition cursor-pointer"
          >
            Tekrar Dene
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="p-8 text-center text-neutral-400 text-xs">
          <Sparkles className="w-6 h-6 mx-auto mb-2 text-neutral-300" />
          Henüz kayıtlı kullanıcı bulunmuyor. İlk adı alan siz olun!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {users.map((user) => {
            const npub = formatNpub(user.pubkey);
            const isCopied = copiedPubkey === user.pubkey;

            return (
              <div
                key={user.pubkey}
                className="group p-4 rounded-2xl bg-neutral-50/60 border border-neutral-200/70 hover:border-purple-200 hover:bg-white transition flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 font-black text-xs flex items-center justify-center border border-purple-200/60 shadow-2xs uppercase">
                    {user.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                        {user.name}
                      </span>
                      <span className="text-2xs text-purple-600 font-medium">@rehber.dev</span>
                      {user.lightning_address && (
                        <span
                          title={`Lightning Aktif: ${user.lightning_address}`}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-3xs font-semibold"
                        >
                          <Zap className="w-2.5 h-2.5 fill-current text-amber-500" />
                          <span>Zap</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xs font-mono text-neutral-500 truncate">
                        {shortenKey(npub, 9, 5)}
                      </span>
                      <span className="text-neutral-300 text-3xs">•</span>
                      <span className="text-3xs text-neutral-400">
                        {formatRelativeTime(user.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopyNpub(user.pubkey, e)}
                    title={isCopied ? 'Kopyalandı!' : 'npub kopyala'}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <a
                    href={`https://njump.me/${npub}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Njump üzerinde profili görüntüle"
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-purple-600 hover:bg-purple-50 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
