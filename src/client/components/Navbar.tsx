import React, { useState } from 'react';
import { Zap, Copy, Check, LogOut, ShieldCheck, ExternalLink, KeyRound } from 'lucide-react';
import { formatNpub, shortenKey } from '../nostr/auth';

interface NavbarProps {
  pubkey: string | null;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ pubkey, onOpenLogin, onLogout }) => {
  const [copied, setCopied] = useState(false);

  const npub = pubkey ? formatNpub(pubkey) : '';

  const handleCopyNpub = () => {
    if (!npub) return;
    navigator.clipboard.writeText(npub);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm shadow-purple-200">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-neutral-900 tracking-tight">rehber<span className="text-purple-600">.dev</span></span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                NIP-05 & Lightning
              </span>
            </div>
          </div>
        </div>

        {/* Navigation & Actions */}
        <div className="flex items-center gap-3">
          <a
            href="https://nostr.org.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-purple-700 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition"
          >
            <span>Nostr Nedir?</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {pubkey ? (
            <div className="flex items-center gap-2 bg-neutral-50 p-1.5 pr-2 rounded-xl border border-neutral-200">
              <button
                onClick={handleCopyNpub}
                title={npub}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-xs font-mono font-medium text-neutral-700 border border-neutral-200 hover:border-purple-300 hover:text-purple-600 transition shadow-2xs"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{shortenKey(npub)}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
              </button>

              <button
                onClick={onLogout}
                title="Çıkış Yap"
                className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm shadow-purple-200 transition active:scale-95"
            >
              <KeyRound className="w-4 h-4" />
              <span>Giriş Yap</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
