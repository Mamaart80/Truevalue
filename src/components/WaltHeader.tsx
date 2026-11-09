import React, { useState } from 'react';
import { ChevronDown, MoreVertical, Check, RefreshCw, Clock } from 'lucide-react';
import { MarketKey } from '../types';
import { FOOTBALL_MARKETS, getMarketDef } from '../data/markets';

interface WaltHeaderProps {
  selectedMarket: MarketKey;
  onSelectMarket: (marketKey: MarketKey) => void;
  onRefresh: () => void;
  isLoading: boolean;
  autoRefreshInterval: number;
  onSetAutoRefreshInterval: (sec: number) => void;
  secondsUntilRefresh: number;
  onOpenMarketDrawer: () => void;
  onResetView?: () => void;
}

export const WaltHeader: React.FC<WaltHeaderProps> = ({
  selectedMarket,
  onSelectMarket,
  onRefresh,
  isLoading,
  autoRefreshInterval,
  onSetAutoRefreshInterval,
  secondsUntilRefresh,
  onOpenMarketDrawer,
  onResetView,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const marketDef = getMarketDef(selectedMarket);

  return (
    <header className="sticky top-0 z-40 bg-[#F0F2F5]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-200/50">
      
      {/* Invisible spacer to maintain centered alignment of market selector */}
      <div className="w-9 h-9" />

      {/* Center: Title + Verified Badge + Down Chevron */}
      <button
        onClick={onOpenMarketDrawer}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-200/50 transition-colors cursor-pointer group select-none"
        title="Changer de marché"
      >
        <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
          MoneyWay <span className="font-semibold text-slate-500 text-sm">({marketDef.shortLabel})</span>
        </span>

        {/* Telegram Verified Checkmark Badge */}
        <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-[#0088CC] text-white shrink-0 shadow-xs">
          <Check className="h-2.5 w-2.5 stroke-[3.5]" />
        </span>

        {/* Dropdown Chevron */}
        <ChevronDown className="h-4 w-4 text-slate-600 group-hover:text-slate-900 transition-transform group-hover:translate-y-0.5" />
      </button>

      {/* Right: Three Dots Menu */}
      <div className="relative">
        <button
          onClick={() => setIsMenuOpen(prev => !prev)}
          className="h-9 w-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-200/60 active:scale-95 transition-all cursor-pointer"
          title="Options & Synchronisation"
        >
          <MoreVertical className="h-5 w-5" />
        </button>

        {/* Options Dropdown Menu */}
        {isMenuOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsMenuOpen(false)} 
            />
            <div className="absolute right-0 top-11 z-50 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-150">
              
              {/* Force Refresh */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onRefresh();
                }}
                disabled={isLoading}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-left cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 text-[#0088CC] ${isLoading ? 'animate-spin' : ''}`} />
                <span>Actualiser en direct</span>
              </button>

              <div className="h-px bg-slate-100 my-1" />

              {/* Auto-Refresh Setting */}
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Synchronisation auto ({secondsUntilRefresh}s)
              </div>
              {[30, 45, 60, 120, 0].map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    onSetAutoRefreshInterval(sec);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    autoRefreshInterval === sec ? 'bg-sky-50 text-[#0088CC] font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>{sec === 0 ? 'Désactivé (Manuel)' : `Toutes les ${sec}s`}</span>
                  {autoRefreshInterval === sec && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}

              <div className="h-px bg-slate-100 my-1" />

              {/* Open Market Drawer */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenMarketDrawer();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors font-medium text-left cursor-pointer"
              >
                <span>Changer de Marché</span>
                <span className="text-[10px] font-mono text-slate-400">9 marchés</span>
              </button>

            </div>
          </>
        )}
      </div>

    </header>
  );
};
