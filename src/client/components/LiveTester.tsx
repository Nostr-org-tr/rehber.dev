import React, { useState } from 'react';
import { Search, Loader2, CheckCircle2, XCircle, Code2, Zap, Shield } from 'lucide-react';

export const LiveTester: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'nip05' | 'lnurl'>('nip05');
  const [result, setResult] = useState<{
    nip05?: { status: number; data: unknown };
    lnurl?: { status: number; data: unknown };
  } | null>(null);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim().toLowerCase().replace('@rehber.dev', '');
    if (!trimmed) return;

    setLoading(true);
    setResult(null);

    try {
      const [nip05Res, lnurlRes] = await Promise.all([
        fetch(`/.well-known/nostr.json?name=${encodeURIComponent(trimmed)}`),
        fetch(`/.well-known/lnurlp/${encodeURIComponent(trimmed)}`)
      ]);

      const nip05Data = await nip05Res.json().catch(() => null);
      const lnurlData = await lnurlRes.json().catch(() => null);

      setResult({
        nip05: { status: nip05Res.status, data: nip05Data },
        lnurl: { status: lnurlRes.status, data: lnurlData }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentData = activeTab === 'nip05' ? result?.nip05 : result?.lnurl;

  return (
    <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-6 sm:p-8 max-w-2xl mx-auto text-left">
      <div className="flex items-center gap-2 mb-2">
        <Code2 className="w-5 h-5 text-purple-600" />
        <h3 className="text-base sm:text-lg font-bold text-neutral-900">
          Canlı NIP-05 & Lightning Doğrulama Aracı
        </h3>
      </div>
      <p className="text-xs text-neutral-500 mb-6">
        Herhangi bir kullanıcı adını yazarak sistemin ürettiği NIP-05 ve LNURL-pay JSON çıktılarını canlı olarak test edebilirsiniz.
      </p>

      <form onSubmit={handleTest} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kullanıcı adı yazın (örn: emre)"
            className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-xs sm:text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 py-3 rounded-2xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition flex items-center gap-2 disabled:bg-neutral-300 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Sorgula</span>
            </>
          )}
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-neutral-100 pb-2">
            <button
              onClick={() => setActiveTab('nip05')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'nip05'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>NIP-05 JSON</span>
              {result.nip05?.status === 200 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-amber-500" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('lnurl')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'lnurl'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-600 fill-current" />
              <span>LNURL-pay JSON</span>
              {result.lnurl?.status === 200 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-neutral-400" />
              )}
            </button>
          </div>

          {/* Endpoint URL display */}
          <div className="text-2xs font-mono text-neutral-500 bg-neutral-50 p-2 rounded-lg border border-neutral-200 truncate">
            GET {activeTab === 'nip05' ? `/.well-known/nostr.json?name=${encodeURIComponent(query.trim())}` : `/.well-known/lnurlp/${encodeURIComponent(query.trim())}`}
          </div>

          {/* JSON Viewer */}
          <div className="bg-neutral-900 rounded-2xl p-4 overflow-x-auto shadow-inner border border-neutral-800">
            <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
              {JSON.stringify(currentData?.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
