import React from 'react';
import { X, Check, Trophy, Target, Goal, Shield, RotateCcw, Gauge, TrendingUp, Clock, Hash, Hourglass } from 'lucide-react';
import { FOOTBALL_MARKETS, getMarketDef, MarketKey } from '../data/markets';

interface MarketDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMarket: MarketKey;
  onSelectMarket: (marketKey: MarketKey) => void;
  marketSummaries?: Record<string, { count: number; volume: number }>;
}

export const MarketDrawerModal: React.FC<MarketDrawerModalProps> = ({
  isOpen,
  onClose,
  selectedMarket,
  onSelectMarket,
  marketSummaries = {},
}) => {
  if (!isOpen) return null;

  const getMarketIcon = (key: MarketKey) => {
    switch (key) {
      case '1x2': return <Trophy className="h-5 w-5 text-amber-500" />;
      case 'over-under-2-5': return <Target className="h-5 w-5 text-red-500" />;
      case 'btts': return <Goal className="h-5 w-5 text-violet-500" />;
      case 'double-chance': return <Shield className="h-5 w-5 text-sky-500" />;
      case 'dnb': return <RotateCcw className="h-5 w-5 text-teal-500" />;
      case 'over-under-1-5': return <Gauge className="h-5 w-5 text-cyan-500" />;
      case 'over-under-3-5': return <TrendingUp className="h-5 w-5 text-indigo-500" />;
      case 'half-time': return <Clock className="h-5 w-5 text-amber-600" />;
      case 'correct-score': return <Hash className="h-5 w-5 text-fuchsia-500" />;
      case 'ht-ft': return <Hourglass className="h-5 w-5 text-rose-500" />;
      default: return <Trophy className="h-5 w-5 text-slate-500" />;
    }
  };

  const formatShortMoney = (num: number) => {
    if (num >= 1000000) return `£${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `£${Math.round(num / 1000)}k`;
    return `£${Math.round(num)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-5 sm:p-6 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250">
        
        {/* Drawer drag handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-200 self-center mb-4 sm:hidden" />

        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Choisir un Marché de Football
            </h3>
            <p className="text-xs text-slate-500">
              Flux officiels Betfair Exchange filtrés en direct
            </p>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Market Options List */}
        <div className="overflow-y-auto py-2 divide-y divide-slate-100 space-y-1">
          {FOOTBALL_MARKETS.map((mDef) => {
            const isSelected = selectedMarket === mDef.key;
            const summary = marketSummaries[mDef.key];
            const count = summary?.count || 0;
            const volume = summary?.volume || 0;

            return (
              <button
                key={mDef.key}
                onClick={() => {
                  onSelectMarket(mDef.key);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left ${
                  isSelected ? 'bg-sky-50/80 ring-1 ring-[#0088CC]/30' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    {getMarketIcon(mDef.key)}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{mDef.label}</span>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#0088CC] text-white">
                          Actif
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {mDef.helpText}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <div className="font-mono font-extrabold text-xs text-slate-900">
                    {formatShortMoney(volume)}
                  </div>
                  <div className="text-[10px] font-bold font-mono text-slate-400">
                    {count} matchs
                  </div>
                </div>
              </button>
            );
          })}
        </div>

      </div>

    </div>
  );
};
