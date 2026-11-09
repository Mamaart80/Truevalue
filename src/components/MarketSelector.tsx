import React from 'react';
import { 
  Trophy, 
  Target, 
  Goal, 
  Shield, 
  RotateCcw, 
  Gauge, 
  TrendingUp, 
  Clock, 
  Hash, 
  Hourglass,
  Layers,
  ChevronRight
} from 'lucide-react';
import { FOOTBALL_MARKETS, MarketKey, MarketDef } from '../data/markets';
import { MarketSummaryItem } from '../types';

interface MarketSelectorProps {
  selectedMarket: MarketKey;
  onSelectMarket: (marketKey: MarketKey) => void;
  marketSummaries?: Record<string, { count: number; volume: number }>;
  isLoading?: boolean;
}

export const MarketSelector: React.FC<MarketSelectorProps> = ({
  selectedMarket,
  onSelectMarket,
  marketSummaries = {},
  isLoading = false,
}) => {
  const getIcon = (key: MarketKey) => {
    switch (key) {
      case '1x2':
        return <Trophy className="h-4 w-4 shrink-0" />;
      case 'over-under-2-5':
        return <Target className="h-4 w-4 shrink-0 text-blue-500" />;
      case 'btts':
        return <Goal className="h-4 w-4 shrink-0 text-violet-500" />;
      case 'double-chance':
        return <Shield className="h-4 w-4 shrink-0 text-indigo-500" />;
      case 'dnb':
        return <RotateCcw className="h-4 w-4 shrink-0 text-teal-500" />;
      case 'over-under-1-5':
        return <Gauge className="h-4 w-4 shrink-0 text-sky-500" />;
      case 'over-under-3-5':
        return <TrendingUp className="h-4 w-4 shrink-0 text-cyan-500" />;
      case 'half-time':
        return <Clock className="h-4 w-4 shrink-0 text-amber-500" />;
      case 'correct-score':
        return <Hash className="h-4 w-4 shrink-0 text-fuchsia-500" />;
      case 'ht-ft':
        return <Hourglass className="h-4 w-4 shrink-0 text-rose-500" />;
      default:
        return <Layers className="h-4 w-4 shrink-0" />;
    }
  };

  const formatShortMoney = (num: number) => {
    if (num >= 1000000) return `£${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `£${Math.round(num / 1000)}k`;
    return `£${Math.round(num)}`;
  };

  return (
    <div className="w-full bg-white rounded-2xl p-2.5 sm:p-3 mb-5 border border-slate-200/80 shadow-xs">
      
      {/* Header bar: Title and market guidance */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-amber-500" />
            <span>Marchés Flux d'Argent (Arbworld)</span>
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">• Sélectionnez un marché pour filtrer la vue</span>
        </div>

        <span className="text-[11px] font-medium text-slate-500 font-mono">
          {FOOTBALL_MARKETS.length} Marchés disponibles
        </span>
      </div>

      {/* Horizontal Scrollable Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200 no-scrollbar">
        {FOOTBALL_MARKETS.map((market) => {
          const isSelected = selectedMarket === market.key;
          const summary = marketSummaries[market.key];
          const count = summary?.count;
          const volume = summary?.volume;

          return (
            <button
              key={market.key}
              onClick={() => onSelectMarket(market.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/15'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/70'
              }`}
              title={market.helpText}
            >
              <span className={isSelected ? 'text-white' : ''}>
                {getIcon(market.key)}
              </span>

              <span>{market.shortLabel}</span>

              {/* Match count & volume badge */}
              <div className="flex items-center gap-1 ml-0.5">
                {count !== undefined ? (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : count > 0 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                ) : null}

                {volume && volume > 0 ? (
                  <span className={`text-[10px] font-mono hidden sm:inline ${isSelected ? 'text-emerald-300' : 'text-slate-500'}`}>
                    {formatShortMoney(volume)}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
};
