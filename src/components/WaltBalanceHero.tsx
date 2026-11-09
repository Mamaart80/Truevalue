import React from 'react';

interface WaltBalanceHeroProps {
  totalVolume: number;
  matchCount: number;
  marketLabel: string;
}

export const WaltBalanceHero: React.FC<WaltBalanceHeroProps> = ({
  totalVolume,
  matchCount,
  marketLabel,
}) => {
  const formattedVolume = '£' + Math.round(totalVolume).toLocaleString('en-GB');

  return (
    <div className="py-6 sm:py-8 flex flex-col items-center justify-center text-center">
      {/* Small uppercase gray label matching "Balance" */}
      <span className="text-xs sm:text-sm font-semibold text-slate-500 tracking-wide">
        Volume Total • {marketLabel}
      </span>

      {/* Giant bold balance text matching "$0.00" in Screenshot 1 */}
      <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mt-1 font-mono">
        {formattedVolume}
      </div>

      {/* Subtitle pill / text */}
      <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
        <span>{matchCount} rencontres cotées en direct sur Betfair</span>
      </div>
    </div>
  );
};
