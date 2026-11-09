import React, { useState } from 'react';
import { Search, Sparkles, TrendingDown, Coins, Trophy, ExternalLink } from 'lucide-react';
import { ScrapedMatch, MarketKey } from '../types';
import { getMarketDef } from '../data/markets';

interface WaltMatchListProps {
  matches: ScrapedMatch[];
  selectedMarket: MarketKey;
  onSelectMatch: (match: ScrapedMatch) => void;
  onOpenAiModal: (match: ScrapedMatch) => void;
  selectedMatchId?: string;
  totalVolume: number;
}

export const WaltMatchList: React.FC<WaltMatchListProps> = ({
  matches,
  selectedMarket,
  onSelectMatch,
  onOpenAiModal,
  selectedMatchId,
  totalVolume,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const marketDef = getMarketDef(selectedMarket);

  const filteredMatches = matches.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return `${m.home} ${m.away} ${m.league} ${m.country}`.toLowerCase().includes(q);
  });

  const formatMoney = (num: number) => {
    return '£' + Math.round(num).toLocaleString('en-GB');
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Pill Search Bar matching Screenshot 2 */}
      <div className="relative">
        <input
          type="text"
          placeholder="Rechercher une équipe, une ligue..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:outline-none focus:border-[#0088CC] shadow-xs transition-colors"
        />
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* 2. Top Summary Card (matching "Dollars USDT $0.00" in Screenshot 1) */}
      <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-base shadow-xs">
            £
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">
              Volume Betfair {marketDef.shortLabel}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Marché Officiel Arbworld
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono font-extrabold text-base text-slate-900">
            {formatMoney(totalVolume)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold font-mono">
            100% Vérifié
          </div>
        </div>
      </div>

      {/* 3. Main Asset List Card (matching "Crypto TOTAL: $0.00" in Screenshot 1) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-100">
        
        {/* Card Header with Category and Blue TOTAL pill */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-900">
            Matchs en direct
          </span>
          <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-sky-50 text-[#0088CC] border border-sky-200">
            TOTAL: {filteredMatches.length}
          </span>
        </div>

        {/* Empty state */}
        {filteredMatches.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400">
            Aucun match trouvé pour cette recherche.
          </div>
        )}

        {/* Match Rows */}
        <div className="divide-y divide-slate-100">
          {filteredMatches.map((match) => {
            const isSelected = selectedMatchId === match.id;
            const minDrop = Math.min(match.drop_1_pct, match.drop_2_pct, match.drop_x_pct);

            return (
              <div
                key={match.id}
                onClick={() => onSelectMatch(match)}
                className={`py-3.5 flex items-center justify-between cursor-pointer group transition-colors -mx-2 px-3 rounded-2xl ${
                  isSelected ? 'bg-sky-50/70 ring-1 ring-sky-300' : 'hover:bg-slate-50'
                }`}
              >
                {/* Left: Match info without circular avatar */}
                <div className="min-w-0 pr-3">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {match.home} <span className="text-slate-400 font-normal">vs</span> {match.away}
                  </div>

                  <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                    <span className="truncate max-w-[160px] font-medium">{match.league}</span>
                    <span>·</span>
                    <span className="font-mono text-slate-600 font-semibold">{match.date_formatted}</span>
                    {minDrop !== 0 && (
                      <>
                        <span>·</span>
                        <span className={`font-mono font-bold ${minDrop < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {minDrop < 0 ? `↓ ${Math.abs(minDrop)}%` : `↑ ${minDrop}%`}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Volume & Dominant Choice Share */}
                <div className="text-right shrink-0">
                  <div className="font-mono font-extrabold text-xs sm:text-sm text-slate-900">
                    {formatMoney(match.total_volume)}
                  </div>

                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {match.dominant_outcome}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {match.dominant_pct}%
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
