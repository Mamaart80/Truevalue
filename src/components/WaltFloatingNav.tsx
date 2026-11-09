import React from 'react';
import { Waves, TrendingUp, Sparkles, Trophy } from 'lucide-react';

export type WaltTab = 'feed' | 'heatmap' | 'signals' | 'results';

interface WaltFloatingNavProps {
  activeTab: WaltTab;
  onTabChange: (tab: WaltTab) => void;
  signalsCount?: number;
}

export const WaltFloatingNav: React.FC<WaltFloatingNavProps> = ({
  activeTab,
  onTabChange,
  signalsCount,
}) => {
  return (
    <div className="fixed bottom-4 inset-x-0 z-50 flex items-center justify-center pointer-events-none px-4">
      
      {/* Floating Capsule Bar matching Screenshot 1 & 2 */}
      <nav className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.12)] p-1.5 flex items-center gap-1 select-none">
        
        {/* 1. Walt / Flux */}
        <button
          onClick={() => onTabChange('feed')}
          className={`flex flex-col items-center justify-center rounded-full transition-all cursor-pointer ${
            activeTab === 'feed'
              ? 'bg-sky-100 text-[#0088CC] px-5 py-1 font-bold'
              : 'text-slate-500 hover:text-slate-800 px-3.5 py-1'
          }`}
        >
          <Waves className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">Walt</span>
        </button>

        {/* 2. Trade / Heatmap */}
        <button
          onClick={() => onTabChange('heatmap')}
          className={`flex flex-col items-center justify-center rounded-full transition-all cursor-pointer ${
            activeTab === 'heatmap'
              ? 'bg-sky-100 text-[#0088CC] px-5 py-1 font-bold'
              : 'text-slate-500 hover:text-slate-800 px-3.5 py-1'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">Trade</span>
        </button>

        {/* 3. Earn / Signaux IA */}
        <button
          onClick={() => onTabChange('signals')}
          className={`flex flex-col items-center justify-center rounded-full transition-all relative cursor-pointer ${
            activeTab === 'signals'
              ? 'bg-sky-100 text-[#0088CC] px-5 py-1 font-bold'
              : 'text-slate-500 hover:text-slate-800 px-3.5 py-1'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">Signaux</span>
          {signalsCount !== undefined && signalsCount > 0 && (
            <span className="absolute -top-1 right-2 bg-rose-500 text-white text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center ring-2 ring-white">
              {signalsCount}
            </span>
          )}
        </button>

        {/* 4. Scores / Résultats */}
        <button
          onClick={() => onTabChange('results')}
          className={`flex flex-col items-center justify-center rounded-full transition-all cursor-pointer ${
            activeTab === 'results'
              ? 'bg-sky-100 text-[#0088CC] px-5 py-1 font-bold'
              : 'text-slate-500 hover:text-slate-800 px-3.5 py-1'
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">Scores</span>
        </button>

      </nav>

    </div>
  );
};
