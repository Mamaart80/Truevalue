import React from 'react';
import { 
  LayoutGrid, 
  Flame, 
  TrendingDown, 
  Activity,
  Sparkles,
  Trophy
} from 'lucide-react';

export type FilterView = 'all' | 'signals' | 'results' | 'whales' | 'drops';

interface NavigationRailProps {
  currentView: FilterView;
  onViewChange: (view: FilterView) => void;
  signalsCount?: number;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentView,
  onViewChange,
  signalsCount,
}) => {
  return (
    <>
      {/* DESKTOP LEFT RAIL */}
      <aside className="hidden md:flex flex-col items-center justify-between w-20 py-8 border-r border-slate-100 bg-white rounded-l-[32px] shrink-0">
        
        {/* Top Logo */}
        <div className="flex flex-col items-center">
          <div 
            onClick={() => onViewChange('all')}
            className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 p-0.5 shadow-md shadow-orange-500/20 flex items-center justify-center cursor-pointer hover:rotate-12 transition-transform"
            title="MoneyWay 1X2 & Multi-Marchés"
          >
            <div className="h-full w-full bg-white rounded-[14px] flex items-center justify-center">
              <Activity className="h-6 w-6 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Action / Filter Icons */}
        <nav className="flex flex-col items-center gap-4">
          
          {/* 1. All Matches (Feed standard) */}
          <button
            onClick={() => onViewChange('all')}
            className={`p-3 rounded-2xl transition-all cursor-pointer ${
              currentView === 'all'
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`}
            title="Marchés en direct (Tableau des cotes et flux)"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>

          {/* 2. Signals & Convergence Matrix */}
          <button
            onClick={() => onViewChange('signals')}
            className={`p-3 rounded-2xl transition-all relative cursor-pointer ${
              currentView === 'signals'
                ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25'
                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
            }`}
            title="Interprétation des Signaux Croisés & Matrice de Convergence"
          >
            <Sparkles className="h-5 w-5" />
            {signalsCount !== undefined && signalsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-white">
                {signalsCount}
              </span>
            )}
          </button>

          {/* 3. Results & Scores Verification (ESPN) */}
          <button
            onClick={() => onViewChange('results')}
            className={`p-3 rounded-2xl transition-all relative cursor-pointer ${
              currentView === 'results'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
            title="Vérification des Résultats & Scores en Direct"
          >
            <Trophy className="h-5 w-5" />
          </button>

          {/* 4. Whales / Smart Money */}
          <button
            onClick={() => onViewChange('whales')}
            className={`p-3 rounded-2xl transition-all relative cursor-pointer ${
              currentView === 'whales'
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`}
            title="Signaux Whales & Smart Money"
          >
            <Flame className="h-5 w-5 text-amber-500" />
          </button>

          {/* 5. Dropping Odds */}
          <button
            onClick={() => onViewChange('drops')}
            className={`p-3 rounded-2xl transition-all cursor-pointer ${
              currentView === 'drops'
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`}
            title="Fortes baisses de cotes"
          >
            <TrendingDown className="h-5 w-5 text-rose-500" />
          </button>

        </nav>

        {/* Empty bottom slot for balance */}
        <div className="w-10 h-10" />

      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-3 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex items-center justify-around">
        <button
          onClick={() => onViewChange('all')}
          className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-colors cursor-pointer ${
            currentView === 'all' ? 'text-slate-900 font-bold' : 'text-slate-400'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${currentView === 'all' ? 'bg-slate-900 text-white shadow-md' : ''}`}>
            <LayoutGrid className="h-4 w-4" />
          </div>
          <span className="text-[10px]">Marchés</span>
        </button>

        <button
          onClick={() => onViewChange('signals')}
          className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-colors relative cursor-pointer ${
            currentView === 'signals' ? 'text-amber-600 font-bold' : 'text-slate-400'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${currentView === 'signals' ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-md font-bold' : ''}`}>
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-[10px]">Signaux</span>
          {signalsCount !== undefined && signalsCount > 0 && (
            <span className="absolute top-1 right-2 bg-rose-500 text-white text-[9px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
              {signalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onViewChange('results')}
          className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-colors cursor-pointer ${
            currentView === 'results' ? 'text-emerald-600 font-bold' : 'text-slate-400'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${currentView === 'results' ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md font-bold' : ''}`}>
            <Trophy className="h-4 w-4" />
          </div>
          <span className="text-[10px]">Résultats</span>
        </button>

        <button
          onClick={() => onViewChange('whales')}
          className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-colors cursor-pointer ${
            currentView === 'whales' ? 'text-amber-600 font-bold' : 'text-slate-400'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${currentView === 'whales' ? 'bg-slate-900 text-white shadow-md' : ''}`}>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-[10px]">Whales</span>
        </button>

        <button
          onClick={() => onViewChange('drops')}
          className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-colors cursor-pointer ${
            currentView === 'drops' ? 'text-rose-600 font-bold' : 'text-slate-400'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${currentView === 'drops' ? 'bg-slate-900 text-white shadow-md' : ''}`}>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </div>
          <span className="text-[10px]">Chutes</span>
        </button>
      </nav>
    </>
  );
};
