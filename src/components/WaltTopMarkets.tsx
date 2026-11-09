import React from 'react';
import { Trophy, Target, Goal, Shield, ChevronRight } from 'lucide-react';
import { MarketKey } from '../types';

interface WaltTopMarketsProps {
  selectedMarket: MarketKey;
  onSelectMarket: (marketKey: MarketKey) => void;
  onOpenMarketDrawer: () => void;
}

export const WaltTopMarkets: React.FC<WaltTopMarketsProps> = ({
  selectedMarket,
  onSelectMarket,
  onOpenMarketDrawer,
}) => {
  const topList: {
    key: MarketKey;
    label: string;
    ticker: string;
    change: string;
    isUp: boolean;
    bg: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: '1x2',
      label: '1X2 Résultat',
      ticker: '1X2',
      change: '↓ 1.30%',
      isUp: false,
      bg: 'bg-amber-500',
      icon: <Trophy className="h-6 w-6 text-white" />,
    },
    {
      key: 'over-under-2-5',
      label: '+/- 2.5 Buts',
      ticker: 'OU 2.5',
      change: '↓ 1.16%',
      isUp: false,
      bg: 'bg-red-500',
      icon: <Target className="h-6 w-6 text-white" />,
    },
    {
      key: 'btts',
      label: 'Les 2 Marquent',
      ticker: 'BTTS',
      change: '↑ 1.66%',
      isUp: true,
      bg: 'bg-amber-400',
      icon: <Goal className="h-6 w-6 text-white" />,
    },
    {
      key: 'double-chance',
      label: 'Double Chance',
      ticker: 'D.CHANCE',
      change: '↓ 0.34%',
      isUp: false,
      bg: 'bg-sky-500',
      icon: <Shield className="h-6 w-6 text-white" />,
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 mb-5 shadow-xs border border-slate-100">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-bold text-[#0088CC]">
          Marchés les plus suivis
        </h3>
        <button
          onClick={onOpenMarketDrawer}
          className="text-xs font-semibold text-[#0088CC] hover:text-[#0077B5] cursor-pointer"
        >
          Voir tout
        </button>
      </div>

      {/* 4 Large Circular Avatars Row */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {topList.map((item) => {
          const isSelected = selectedMarket === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectMarket(item.key)}
              className="flex flex-col items-center justify-center p-1.5 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer group active:scale-95"
            >
              {/* Circular Colored Avatar */}
              <div className={`h-14 w-14 rounded-full ${item.bg} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${
                isSelected ? 'ring-4 ring-[#0088CC]/30' : ''
              }`}>
                {item.icon}
              </div>

              {/* Ticker Name */}
              <span className="text-xs font-bold text-slate-900 mt-2 block truncate max-w-[70px]">
                {item.ticker}
              </span>

              {/* Percentage Change */}
              <span className={`text-[11px] font-mono font-semibold block mt-0.5 ${
                item.isUp ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                {item.change}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
};
