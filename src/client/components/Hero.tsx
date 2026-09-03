import React from 'react';
import { ShieldCheck, Zap, Globe, Sparkles, ExternalLink } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <div className="text-center py-10 sm:py-14 max-w-3xl mx-auto px-4">
      {/* Small badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-semibold mb-6 shadow-2xs">
        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
        <span>NIP-05 Doğrulama & Lightning Adres Yönlendirici</span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight sm:leading-tight mb-4">
        Nostr ve Lightning Adresin: <br className="hidden sm:inline" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
          adiniz@rehber.dev
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto mb-8 leading-relaxed">
        Karmaşık <code>npub...</code> adresleri yerine kolayca hatırlanan <strong>adiniz@rehber.dev</strong> adresi alın. 
        Tüm Nostr uygulamalarında onaylı hesap rozeti kazanın ve dilerseniz Alby veya Wallet of Satoshi cüzdanınıza Zap / Satoshi ödemesi yönlendirin.
      </p>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-8">
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:border-purple-200 transition">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-neutral-900 mb-1">NIP-05 Onay Rozeti</h3>
          <p className="text-xs text-neutral-500 leading-normal">
            Damus, Amethyst, Primal ve tüm istemcilerde mor doğrulama rozeti.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:border-amber-200 transition">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <h3 className="font-bold text-sm text-neutral-900 mb-1">Lightning & Zap (Opsiyonel)</h3>
          <p className="text-xs text-neutral-500 leading-normal">
            Alby veya WalletOfSatoshi adresinize gelen Satoshi ve Zap'leri doğrudan aktarır.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:border-blue-200 transition">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
            <Globe className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-neutral-900 mb-1">Röle Yönetimi</h3>
          <p className="text-xs text-neutral-500 leading-normal">
            Sizi bulmak isteyen kişilere en güncel röle (relay) listenizi sunar.
          </p>
        </div>
      </div>

      {/* Nostr.org.tr Friendly Onboarding Alert */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-blue-50/70 border border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3">
          <span className="text-xl">💡</span>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-neutral-900">
              Henüz bir Nostr hesabınız yok mu?
            </p>
            <p className="text-xs text-neutral-600">
              Nostr'ı keşfetmek ve ücretsiz açık/gizli anahtarlarınızı oluşturmak için Türkçe topluluk rehberini ziyaret edebilirsiniz.
            </p>
          </div>
        </div>
        <a
          href="https://nostr.org.tr"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-purple-200 text-purple-700 text-xs font-bold hover:bg-purple-600 hover:text-white hover:border-purple-600 transition shadow-2xs"
        >
          <span>nostr.org.tr</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
