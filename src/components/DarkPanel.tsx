import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  ExternalLink, 
  LineChart, 
  ShieldCheck, 
  Flame,
  CheckCircle2,
  TrendingDown,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ScrapedMatch, MarketKey } from '../types';
import { getMarketDef } from '../data/markets';

interface DarkPanelProps {
  selectedMatch: ScrapedMatch | null;
  onOpenAiModal: (match: ScrapedMatch) => void;
  matches: ScrapedMatch[];
  onSelectMatch: (match: ScrapedMatch) => void;
  onSwitchMarket?: (marketKey: MarketKey) => void;
}

const crossMarketCache: Record<string, any[]> = {};

export const DarkPanel: React.FC<DarkPanelProps> = ({
  selectedMatch,
  onOpenAiModal,
  matches,
  onSelectMatch,
  onSwitchMarket,
}) => {
  const currentMatch = selectedMatch || matches[0];
  const [crossMarkets, setCrossMarkets] = useState<any[]>(() => {
    if (!currentMatch) return [];
    const cacheKey = `${currentMatch.home}_${currentMatch.away}`.toLowerCase();
    return crossMarketCache[cacheKey] || [];
  });
  const [isCrossLoading, setIsCrossLoading] = useState(false);

  useEffect(() => {
    if (!currentMatch) return;
    const cacheKey = `${currentMatch.home}_${currentMatch.away}`.toLowerCase();
    if (crossMarketCache[cacheKey]) {
      setCrossMarkets(crossMarketCache[cacheKey]);
      setIsCrossLoading(false);
      return;
    }

    let isMounted = true;
    setIsCrossLoading(true);

    fetch(`/api/moneyway/match-cross-markets?home=${encodeURIComponent(currentMatch.home)}&away=${encodeURIComponent(currentMatch.away)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.markets)) {
          crossMarketCache[cacheKey] = data.markets;
          setCrossMarkets(data.markets);
        }
      })
      .catch(err => console.warn('Failed to fetch cross markets:', err))
      .finally(() => {
        if (isMounted) setIsCrossLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentMatch?.home, currentMatch?.away]);

  if (!currentMatch) return null;

  const formatMoney = (num: number) => {
    return '£' + Math.round(num).toLocaleString('en-GB');
  };

  const marketDef = getMarketDef(currentMatch.market_key || '1x2');
  const isTwoWay = currentMatch.market_type === '2_way';
  const isMulti = currentMatch.market_type === 'multi';

  const isDominant1 = currentMatch.dominant_outcome === currentMatch.label_1 || currentMatch.dominant_outcome === '1';
  const isDominantX = currentMatch.dominant_outcome === currentMatch.label_x || currentMatch.dominant_outcome === 'X';
  const isDominant2 = currentMatch.dominant_outcome === currentMatch.label_2 || currentMatch.dominant_outcome === '2';

  return (
    <aside className="w-full lg:w-[380px] bg-[#22262B] text-white p-6 sm:p-7 rounded-3xl lg:rounded-r-[32px] lg:rounded-l-none flex flex-col justify-between shrink-0 shadow-2xl">
      
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Analyse du Match
              </h2>
            </div>
            <p className="text-[11px] text-slate-400">
              Flux Betfair • <span className="text-amber-400 font-semibold">{marketDef.shortLabel}</span>
            </p>
          </div>

          <div className="relative">
            <select
              aria-label="Changer de match"
              value={currentMatch.id}
              onChange={(e) => {
                const found = matches.find(m => m.id === e.target.value);
                if (found) onSelectMatch(found);
              }}
              className="appearance-none bg-[#2D3239] text-xs text-slate-200 font-medium pl-3 pr-7 py-1.5 rounded-xl border border-slate-700/60 focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              {matches.map(m => (
                <option key={m.id} value={m.id}>
                  {m.home.slice(0, 10)} vs {m.away.slice(0, 10)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Selected Match Card */}
        <div className="bg-[#2A2F36] rounded-2xl p-4 mb-4 border border-slate-700/50">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <div className="flex items-center gap-1.5 truncate">
              {currentMatch.flag_url && (
                <img 
                  src={currentMatch.flag_url} 
                  alt={currentMatch.country}
                  className="h-3 w-4 rounded-xs object-cover border border-slate-600 shrink-0" 
                />
              )}
              <span className="truncate max-w-[150px] font-medium text-slate-300">{currentMatch.league}</span>
            </div>
            <span className="font-mono text-slate-400">{currentMatch.date_formatted}</span>
          </div>

          <h3 className="text-base font-bold text-white mb-2 leading-snug">
            {currentMatch.home} <span className="text-slate-400 font-normal text-xs">vs</span> {currentMatch.away}
          </h3>

          <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Marché :</span>
              <span className="text-white font-semibold font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded">
                {marketDef.shortLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white">{formatMoney(currentMatch.total_volume)}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {currentMatch.liquidity_tier}
              </span>
            </div>
          </div>
        </div>

        {/* Outcome Breakdown Cards (Adapts to 2-way vs 3-way) */}
        <div className="space-y-2 mb-4">
          
          {/* Issue 1 */}
          <div className={`rounded-xl p-3 text-slate-900 transition-all ${
            isDominant1 
              ? 'bg-white ring-2 ring-emerald-500 shadow-md' 
              : 'bg-white/95'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold truncate">
                {currentMatch.label_1}
              </span>
              <span className="text-xs font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                {currentMatch.pct_1}%
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1 text-slate-600">
                <span>Cote :</span>
                <span className="font-bold text-slate-900">@{currentMatch.coef_1_new.toFixed(2)}</span>
                {currentMatch.drop_1_pct !== 0 && (
                  <span className={`text-[10px] font-semibold flex items-center ${currentMatch.drop_1_pct < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {currentMatch.drop_1_pct < 0 ? <ArrowDown className="h-3 w-3 inline" /> : <ArrowUp className="h-3 w-3 inline" />}
                    {currentMatch.drop_1_pct}%
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-800 font-extrabold">
                {formatMoney(currentMatch.volume_1)}
              </span>
            </div>
          </div>

          {/* Issue X (Only if not 2-way) */}
          {!isTwoWay && (
            <div className={`rounded-xl p-3 text-slate-900 transition-all ${
              isDominantX 
                ? 'bg-white ring-2 ring-emerald-500 shadow-md' 
                : 'bg-white/95'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold truncate">
                  {currentMatch.label_x || 'Nul'}
                </span>
                <span className="text-xs font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                  {currentMatch.pct_x}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1 text-slate-600">
                  <span>Cote :</span>
                  <span className="font-bold text-slate-900">@{currentMatch.coef_x_new.toFixed(2)}</span>
                  {currentMatch.drop_x_pct !== 0 && (
                    <span className={`text-[10px] font-semibold flex items-center ${currentMatch.drop_x_pct < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {currentMatch.drop_x_pct < 0 ? <ArrowDown className="h-3 w-3 inline" /> : <ArrowUp className="h-3 w-3 inline" />}
                      {currentMatch.drop_x_pct}%
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-800 font-extrabold">
                  {formatMoney(currentMatch.volume_x)}
                </span>
              </div>
            </div>
          )}

          {/* Issue 2 */}
          <div className={`rounded-xl p-3 text-slate-900 transition-all ${
            isDominant2 
              ? 'bg-white ring-2 ring-emerald-500 shadow-md' 
              : 'bg-white/95'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold truncate">
                {currentMatch.label_2}
              </span>
              <span className="text-xs font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                {currentMatch.pct_2}%
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1 text-slate-600">
                <span>Cote :</span>
                <span className="font-bold text-slate-900">@{currentMatch.coef_2_new.toFixed(2)}</span>
                {currentMatch.drop_2_pct !== 0 && (
                  <span className={`text-[10px] font-semibold flex items-center ${currentMatch.drop_2_pct < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {currentMatch.drop_2_pct < 0 ? <ArrowDown className="h-3 w-3 inline" /> : <ArrowUp className="h-3 w-3 inline" />}
                    {currentMatch.drop_2_pct}%
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-800 font-extrabold">
                {formatMoney(currentMatch.volume_2)}
              </span>
            </div>
          </div>

        </div>

        {/* Cross-Market Awareness: Other markets available for this fixture */}
        <div className="bg-[#2A2F36] rounded-2xl p-3.5 mb-4 border border-slate-700/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-amber-400" />
              <span>Autres Marchés de ce match</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400">
              {crossMarkets.length} détecté{crossMarkets.length > 1 ? 's' : ''}
            </span>
          </div>

          {isCrossLoading ? (
            <div className="text-center py-2 text-xs text-slate-500">
              Recherche multi-marchés...
            </div>
          ) : crossMarkets.length > 0 ? (
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
              {crossMarkets.map((cm, idx) => {
                const isCurrent = cm.market_key === currentMatch.market_key;
                const mDef = getMarketDef(cm.market_key);

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onSwitchMarket && !isCurrent) {
                        onSwitchMarket(cm.market_key);
                      }
                    }}
                    className={`p-2 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isCurrent 
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                        : 'bg-[#22262B] hover:bg-[#323842] border-slate-700/50 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{mDef.shortLabel}</span>
                        {isCurrent && <span className="text-[9px] text-amber-400 font-mono">(actif)</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        Flux : {cm.dominant_label} ({cm.dominant_pct}%)
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-400 block">
                        {formatMoney(cm.total_volume)}
                      </span>
                      {!isCurrent && (
                        <span className="text-[9px] text-slate-400 hover:text-white flex items-center justify-end gap-0.5">
                          Basculer <ArrowRight className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              Ce match n'enregistre actuellement pas de volume sur les autres marchés Arbworld.
            </p>
          )}
        </div>

      </div>

      {/* Bottom Action: Open Deep AI Modal */}
      <div className="pt-3 border-t border-slate-700/60">
        <button
          onClick={() => onOpenAiModal(currentMatch)}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-extrabold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all cursor-pointer text-xs sm:text-sm"
        >
          <Sparkles className="h-4 w-4" />
          <span>Lancer l'Analyse Smart Money (IA)</span>
        </button>
      </div>

    </aside>
  );
};
