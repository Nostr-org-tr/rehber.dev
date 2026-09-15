import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { RegisterForm } from './components/RegisterForm';
import { Dashboard } from './components/Dashboard';
import { LiveTester } from './components/LiveTester';
import { RecentRegistrations } from './components/RecentRegistrations';
import { BunkerModal } from './components/BunkerModal';
import { connectExtension, connectBunker, connectNsec, type NostrSigner } from './nostr/auth';
import type { Nip05Record, ProfileResponse } from '../shared/types';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [signer, setSigner] = useState<NostrSigner | null>(null);
  const [record, setRecord] = useState<Nip05Record | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string>('0x4AAAAAAEl4x1ap7RLYnwSq');
  const [recentRefreshTrigger, setRecentRefreshTrigger] = useState<number>(0);

  // Fetch runtime config (Turnstile Site Key from Cloudflare Worker)
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data: { turnstileSiteKey?: string }) => {
        if (data.turnstileSiteKey) {
          setTurnstileSiteKey(data.turnstileSiteKey);
        }
      })
      .catch(() => {
        // Fallback default
      });
  }, []);

  const fetchProfile = useCallback(async (pk: string) => {
    setLoadingProfile(true);
    try {
      const res = await fetch(`/api/profile?pubkey=${encodeURIComponent(pk)}`);
      const data = (await res.json()) as ProfileResponse;
      if (data.registered && data.record) {
        setRecord(data.record);
      } else {
        setRecord(null);
      }
    } catch (err) {
      console.error('Profil yüklenemedi:', err);
      setRecord(null);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // Restore session from localStorage or sessionStorage if present
  useEffect(() => {
    const savedType = sessionStorage.getItem('rehber_auth_type') || localStorage.getItem('rehber_auth_type');
    const savedBunkerUri = sessionStorage.getItem('rehber_bunker_uri') || localStorage.getItem('rehber_bunker_uri');
    const savedNsec = sessionStorage.getItem('rehber_nsec') || localStorage.getItem('rehber_nsec');

    if (savedType === 'extension' && typeof window !== 'undefined' && window.nostr) {
      connectExtension()
        .then(({ signer: s, pubkey: pk }) => {
          setSigner(s);
          setPubkey(pk);
          fetchProfile(pk);
        })
        .catch(() => {
          localStorage.removeItem('rehber_auth_type');
          sessionStorage.removeItem('rehber_auth_type');
        });
    } else if (savedType === 'bunker' && savedBunkerUri) {
      connectBunker(savedBunkerUri)
        .then(({ signer: s, pubkey: pk }) => {
          setSigner(s);
          setPubkey(pk);
          fetchProfile(pk);
        })
        .catch(() => {
          localStorage.removeItem('rehber_auth_type');
          localStorage.removeItem('rehber_bunker_uri');
          sessionStorage.removeItem('rehber_auth_type');
          sessionStorage.removeItem('rehber_bunker_uri');
        });
    } else if (savedType === 'nsec' && savedNsec) {
      try {
        const { signer: s, pubkey: pk } = connectNsec(savedNsec);
        setSigner(s);
        setPubkey(pk);
        fetchProfile(pk);
      } catch {
        localStorage.removeItem('rehber_auth_type');
        localStorage.removeItem('rehber_nsec');
        sessionStorage.removeItem('rehber_auth_type');
        sessionStorage.removeItem('rehber_nsec');
      }
    }
  }, [fetchProfile]);

  const handleLoginSuccess = (newSigner: NostrSigner, newPubkey: string, rememberMe = true) => {
    setSigner(newSigner);
    setPubkey(newPubkey);

    const targetStorage = rememberMe ? localStorage : sessionStorage;
    const cleanStorage = rememberMe ? sessionStorage : localStorage;

    cleanStorage.removeItem('rehber_auth_type');
    cleanStorage.removeItem('rehber_bunker_uri');
    cleanStorage.removeItem('rehber_nsec');

    targetStorage.setItem('rehber_auth_type', newSigner.type);
    if (newSigner.type === 'bunker' && newSigner.bunkerUri) {
      targetStorage.setItem('rehber_bunker_uri', newSigner.bunkerUri);
    }
    if (newSigner.type === 'nsec' && newSigner.nsec) {
      targetStorage.setItem('rehber_nsec', newSigner.nsec);
    }

    fetchProfile(newPubkey);
  };

  const handleLogout = () => {
    setPubkey(null);
    setSigner(null);
    setRecord(null);
    localStorage.removeItem('rehber_auth_type');
    localStorage.removeItem('rehber_bunker_uri');
    localStorage.removeItem('rehber_nsec');
    sessionStorage.removeItem('rehber_auth_type');
    sessionStorage.removeItem('rehber_bunker_uri');
    sessionStorage.removeItem('rehber_nsec');
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 selection:bg-purple-100 selection:text-purple-900">
      <Navbar
        pubkey={pubkey}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 space-y-12">
        <Hero />

        {loadingProfile ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-neutral-500">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            <span className="text-xs font-medium">Profiliniz yükleniyor...</span>
          </div>
        ) : record ? (
          <Dashboard
            record={record}
            signer={signer}
            turnstileSiteKey={turnstileSiteKey}
            onUpdate={(updated) => setRecord(updated)}
            onDelete={() => {
              setRecord(null);
              setRecentRefreshTrigger((prev) => prev + 1);
            }}
          />
        ) : (
          <RegisterForm
            pubkey={pubkey}
            signer={signer}
            turnstileSiteKey={turnstileSiteKey}
            onOpenLogin={() => setLoginModalOpen(true)}
            onSuccess={(newRecord) => {
              setRecord(newRecord);
              setRecentRefreshTrigger((prev) => prev + 1);
            }}
          />
        )}

        {/* Son Alınan Kullanıcı Adları (Recent Registrations) */}
        <RecentRegistrations refreshTrigger={recentRefreshTrigger} />

        {/* Live Playground / Tester */}
        <div className="pt-8">
          <LiveTester />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-8 mt-16 text-center text-xs text-neutral-500">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-800">rehber.dev</span>
            <span>—</span>
            <span>Nostr NIP-05, NIP-98 & LUD-16 Servisi</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <a
              href="https://nostr.org.tr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 hover:text-purple-600 transition"
            >
              nostr.org.tr
            </a>
            <a
              href="https://nostrhub.io/nip/05"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 hover:text-purple-600 transition"
            >
              NIP-05 Spesifikasyonu
            </a>
            <a
              href="https://github.com/lnurl/luds/blob/luds/16.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 hover:text-amber-600 transition"
            >
              LUD-16
            </a>
          </div>
        </div>
      </footer>

      <BunkerModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
};
