import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  ExternalLink, 
  LineChart, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Brain, 
  DollarSign, 
  Flame, 
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ScrapedMatch, AiMatchAnalysis, MarketKey } from '../types';
import { getMarketDef } from '../data/markets';

interface MatchDetailModalProps {
  match: ScrapedMatch | null;
  onClose: () => void;
  onSelectMarket?: (marketKey: MarketKey) => void;
}

const crossMarketModalCache: Record<string, any[]> = {};
const aiAnalysisCache: Record<string, AiMatchAnalysis> = {};

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  match,
  onClose,
  onSelectMarket,
}) => {
  const matchId = match?.id || '';
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiMatchAnalysis | null>(() => {
    return matchId ? (aiAnalysisCache[matchId] || null) : null;
  });
  const [aiError, setAiError] = useState<string | null>(null);

  // Cross-market fixtures for this match
  const [crossMarkets, setCrossMarkets] = useState<any[]>(() => {
    if (!match) return [];
    const key = `${match.home}_${match.away}`.toLowerCase();
    return crossMarketModalCache[key] || [];
  });
  const [isCrossLoading, setIsCrossLoading] = useState(false);

  useEffect(() => {
    if (!match) return;
    const key = `${match.home}_${match.away}`.toLowerCase();
    
    // Check cached AI analysis
    if (aiAnalysisCache[match.id]) {
      setAiAnalysis(aiAnalysisCache[match.id]);
    } else {
      setAiAnalysis(null);
    }
    setAiError(null);

    // Check cached cross-market fixtures
    if (crossMarketModalCache[key]) {
      setCrossMarkets(crossMarketModalCache[key]);
      setIsCrossLoading(false);
      return;
    }

    setIsCrossLoading(true);
    fetch(`/api/moneyway/match-cross-markets?home=${encodeURIComponent(match.home)}&away=${encodeURIComponent(match.away)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.markets)) {
          crossMarketModalCache[key] = data.markets;
          setCrossMarkets(data.markets);
        }
      })
      .catch(err => console.warn('Failed to load cross markets for modal:', err))
      .finally(() => setIsCrossLoading(false));
  }, [match?.id, match?.home, match?.away]);

  if (!match) return null;

  const formatGBP = (num: number) => '£' + Math.round(num).toLocaleString('fr-FR');
  const marketDef = getMarketDef(match.market_key || '1x2');
  const isTwoWay = match.market_type === '2_way';
  const isMulti = match.market_type === 'multi';

  const fetchAiAnalysis = async () => {
    if (aiAnalysisCache[match.id]) {
      setAiAnalysis(aiAnalysisCache[match.id]);
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/analyze-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          match, 
          marketKey: match.market_key || '1x2' 
        }),
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        aiAnalysisCache[match.id] = data.analysis;
        setAiAnalysis(data.analysis);
      } else {
        throw new Error(data.error || 'Impossible de générer l\'analyse IA.');
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Erreur lors de la génération de l\'analyse');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div 
        className="relative w-full max-w-3xl bg-white border border-slate-200/80 rounded-3xl sm:rounded-[32px] shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] text-slate-900 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="border-b border-slate-100 bg-[#F0F2F5]/80 backdrop-blur-md px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {match.flag_url && (
              <img 
                src={match.flag_url} 
                alt={match.country}
                className="h-5 w-7 rounded object-cover border border-slate-200 shadow-xs"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#0088CC] uppercase tracking-wider">
                  {match.league} ({match.country})
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] text-slate-500 font-mono">{match.date_formatted}</span>
                <span className="text-slate-300">•</span>
                <span className="text-[10px] font-bold text-[#0088CC] bg-sky-100 px-2 py-0.5 rounded-full">
                  {marketDef.shortLabel}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
                <span>{match.home}</span>
                <span className="text-slate-400 font-normal">vs</span>
                <span>{match.away}</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">

          {/* Top Quick Overview Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100">
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Volume {marketDef.shortLabel}</div>
              <div className="text-lg font-extrabold font-mono text-slate-900 mt-0.5">{formatGBP(match.total_volume)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Choix Dominant</div>
              <div className="text-lg font-extrabold font-mono text-emerald-600 mt-0.5">
                {match.dominant_outcome} ({match.dominant_pct}%)
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Smart Money</div>
              <div className="text-lg font-extrabold font-mono text-[#0088CC] mt-0.5">
                {match.smart_money_score}/100
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Liquidité Tier</div>
              <div className="text-xs font-bold text-slate-700 mt-1">
                {match.liquidity_tier === 'WHALE' ? '🐋 Whale Pool' : match.liquidity_tier === 'HIGH' ? '💰 Forte' : 'Standard'}
              </div>
            </div>
          </div>

          {/* Outcome Breakdown Cards (2-way vs 3-way) */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Distribution des flux sur le marché {marketDef.label}
            </h3>

            {isTwoWay ? (
              // 2-Way Comparison
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1 */}
                <div className={`p-4 rounded-2xl border ${
                  match.dominant_outcome === match.label_1 
                    ? 'bg-sky-50/50 border-[#0088CC]/30 ring-1 ring-[#0088CC]/20' 
                    : 'bg-white border-slate-100 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-sm">{match.label_1}</span>
                    <span className="font-mono font-bold text-sm text-[#0088CC]">{match.pct_1}%</span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Cote :</span>
                      <span className="text-slate-900 font-mono font-bold">@{match.coef_1_new.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volume :</span>
                      <span className="text-slate-900 font-mono font-bold">{formatGBP(match.volume_1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Divergence Volume / Proba :</span>
                      <span className={`font-mono font-bold ${match.divergence_1 > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {match.divergence_1 > 0 ? `+${match.divergence_1}%` : `${match.divergence_1}%`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Option 2 */}
                <div className={`p-4 rounded-2xl border ${
                  match.dominant_outcome === match.label_2 
                    ? 'bg-sky-50/50 border-[#0088CC]/30 ring-1 ring-[#0088CC]/20' 
                    : 'bg-white border-slate-100 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-sm">{match.label_2}</span>
                    <span className="font-mono font-bold text-sm text-[#0088CC]">{match.pct_2}%</span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Cote :</span>
                      <span className="text-slate-900 font-mono font-bold">@{match.coef_2_new.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volume :</span>
                      <span className="text-slate-900 font-mono font-bold">{formatGBP(match.volume_2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Divergence Volume / Proba :</span>
                      <span className={`font-mono font-bold ${match.divergence_2 > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {match.divergence_2 > 0 ? `+${match.divergence_2}%` : `${match.divergence_2}%`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // 3-Way Comparison
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl border bg-white border-slate-100 shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs truncate">{match.label_1}</span>
                    <span className="font-mono font-bold text-xs text-[#0088CC]">{match.pct_1}%</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Cote :</span>
                      <span className="text-slate-900 font-mono font-bold">@{match.coef_1_new.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volume :</span>
                      <span className="text-slate-900 font-mono font-bold">{formatGBP(match.volume_1)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border bg-white border-slate-100 shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs truncate">{match.label_x || 'Nul'}</span>
                    <span className="font-mono font-bold text-xs text-teal-600">{match.pct_x}%</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Cote :</span>
                      <span className="text-slate-900 font-mono font-bold">@{match.coef_x_new.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volume :</span>
                      <span className="text-slate-900 font-mono font-bold">{formatGBP(match.volume_x)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border bg-white border-slate-100 shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs truncate">{match.label_2}</span>
                    <span className="font-mono font-bold text-xs text-amber-600">{match.pct_2}%</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Cote :</span>
                      <span className="text-slate-900 font-mono font-bold">@{match.coef_2_new.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volume :</span>
                      <span className="text-slate-900 font-mono font-bold">{formatGBP(match.volume_2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CROSS-MARKET SECTION: Shows all other markets found for this exact fixture */}
          <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#0088CC]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Tous les marchés cotés pour cette rencontre
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#0088CC] font-bold">
                {crossMarkets.length} marché{crossMarkets.length > 1 ? 's' : ''} actif{crossMarkets.length > 1 ? 's' : ''}
              </span>
            </div>

            {isCrossLoading ? (
              <div className="text-center py-4 text-xs text-slate-400">
                Recherche de correspondances dans les autres flux...
              </div>
            ) : crossMarkets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {crossMarkets.map((cm, idx) => {
                  const mDef = getMarketDef(cm.market_key);
                  const isCurrent = cm.market_key === match.market_key;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border flex items-center justify-between ${
                        isCurrent
                          ? 'bg-sky-50 border-sky-300 ring-1 ring-sky-200'
                          : 'bg-white border-slate-100 shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">{mDef.label}</span>
                          {isCurrent && <span className="text-[9px] font-mono bg-[#0088CC] text-white px-1.5 py-0.2 rounded-full">(actif)</span>}
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Tendance : <span className="text-slate-800 font-semibold">{cm.dominant_label}</span> ({cm.dominant_pct}%)
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-slate-900 block">
                          {formatGBP(cm.total_volume)}
                        </span>
                        {onSelectMarket && !isCurrent && (
                          <button
                            onClick={() => {
                              onSelectMarket(cm.market_key);
                              onClose();
                            }}
                            className="text-[10px] text-[#0088CC] hover:text-[#0077B5] flex items-center justify-end gap-1 font-semibold mt-0.5 cursor-pointer"
                          >
                            <span>Ouvrir marché</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-1">
                Aucun autre marché n'a de volume enregistré pour cette rencontre spécifique sur Arbworld en ce moment.
              </p>
            )}
          </div>

          {/* AI Analysis Section */}
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#0088CC]" />
                <h3 className="text-sm font-bold text-slate-900">Analyse Smart Money Assistée par IA</h3>
              </div>

              {!aiAnalysis && (
                <button
                  onClick={fetchAiAnalysis}
                  disabled={isAiLoading}
                  className="px-3.5 py-1.5 rounded-full bg-[#0088CC] hover:bg-[#0077B5] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isAiLoading ? 'Analyse en cours...' : 'Générer l\'analyse'}</span>
                </button>
              )}
            </div>

            {isAiLoading && (
              <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-[#0088CC]" />
                <span>Décryptage des volumes professionnels, cotes et probabilités implicites...</span>
              </div>
            )}

            {aiError && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                {aiError}
              </div>
            )}

            {aiAnalysis && (
              <div className="space-y-3.5 text-xs">
                <div className="border-l-3 border-[#0088CC] pl-3">
                  <h4 className="font-extrabold text-slate-900 text-sm">{aiAnalysis.headline}</h4>
                  <p className="text-slate-600 mt-1">{aiAnalysis.marketDynamic}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Pression Sharp vs Public</span>
                    <p className="text-slate-700">{aiAnalysis.sharpVsPublic}</p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Divergence Cotes vs Mises</span>
                    <p className="text-slate-700">{aiAnalysis.impliedVsReal}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Verdict :</span>
                    <span className="font-bold text-emerald-600">{aiAnalysis.verdict}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Niveau de risque :</span>
                    <span className="font-bold text-amber-600">{aiAnalysis.riskLevel}</span>
                  </div>
                </div>

                <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl text-sky-900">
                  <span className="font-bold block mb-0.5">Conseil Stratégique :</span>
                  <span>{aiAnalysis.keyAdvice}</span>
                </div>
              </div>
            )}
          </div>

          {/* External Links */}
          <div className="flex items-center justify-between pt-2 text-xs">
            <a
              href={match.betfair_market_url}
              target="_blank"
              rel="noreferrer"
              className="text-[#0088CC] hover:text-[#0077B5] font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Voir le carnet d'ordres sur Betfair Exchange</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
