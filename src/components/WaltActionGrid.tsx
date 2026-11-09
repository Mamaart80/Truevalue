import React from 'react';
import { Send, PlusCircle, ArrowUpCircle, ArrowLeftRight } from 'lucide-react';
import { FilterView } from './NavigationRail';

interface WaltActionGridProps {
  currentView: FilterView;
  onViewChange: (view: FilterView) => void;
  onOpenMarketDrawer: () => void;
  whaleCount: number;
  dropCount: number;
}

export const WaltActionGrid: React.FC<WaltActionGridProps> = ({
  currentView,
  onViewChange,
  onOpenMarketDrawer,
  whaleCount,
  dropCount,
}) => {
  return (
    <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 mb-5 px-1">
      
      {/* 1. Marchés (Transfer icon) */}
      <button
        onClick={onOpenMarketDrawer}
        className="bg-white rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-xs border border-slate-100 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer group"
      >
        <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-800 group-hover:bg-[#0088CC]/10 group-hover:text-[#0088CC] transition-colors">
          <Send className="h-5 w-5 -rotate-45 ml-0.5" />
        </div>
        <span className="text-xs font-bold text-slate-800 leading-tight">
          Marchés
        </span>
      </button>

      {/* 2. Whales (Deposit icon) */}
      <button
        onClick={() => onViewChange(currentView === 'whales' ? 'all' : 'whales')}
        className={`rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-xs border transition-all cursor-pointer group active:scale-95 ${
          currentView === 'whales'
            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
            : 'bg-white text-slate-800 border-slate-100 hover:bg-slate-50'
        }`}
      >
        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
          currentView === 'whales' ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-800 group-hover:text-amber-600'
        }`}>
          <PlusCircle className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold leading-tight">
          Whales {whaleCount > 0 ? `(${whaleCount})` : ''}
        </span>
      </button>

      {/* 3. Chutes (Withdraw icon) */}
      <button
        onClick={() => onViewChange(currentView === 'drops' ? 'all' : 'drops')}
        className={`rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-xs border transition-all cursor-pointer group active:scale-95 ${
          currentView === 'drops'
            ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
            : 'bg-white text-slate-800 border-slate-100 hover:bg-slate-50'
        }`}
      >
        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
          currentView === 'drops' ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-800 group-hover:text-rose-600'
        }`}>
          <ArrowUpCircle className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold leading-tight">
          Chutes {dropCount > 0 ? `(${dropCount})` : ''}
        </span>
      </button>

      {/* 4. Signaux IA (Exchange icon) */}
      <button
        onClick={() => onViewChange('signals')}
        className={`rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-xs border transition-all cursor-pointer group active:scale-95 ${
          currentView === 'signals'
            ? 'bg-[#0088CC] text-white border-[#0088CC] shadow-md shadow-[#0088CC]/20'
            : 'bg-white text-slate-800 border-slate-100 hover:bg-slate-50'
        }`}
      >
        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
          currentView === 'signals' ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-800 group-hover:text-[#0088CC]'
        }`}>
          <ArrowLeftRight className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold leading-tight">
          Signaux IA
        </span>
      </button>

    </div>
  );
};
