import React from 'react';
import { ScrapedMatch } from '../types';

interface WaltMarketHeatmapProps {
  matches: ScrapedMatch[];
  onSelectMatch: (match: ScrapedMatch) => void;
}

export const WaltMarketHeatmap: React.FC<WaltMarketHeatmapProps> = ({
  matches,
  onSelectMatch,
}) => {
  // Take top 16 matches for heatmap
  const topMatches = React.useMemo(() => {
    return [...matches].sort((a, b) => b.total_volume - a.total_volume).slice(0, 16);
  }, [matches]);

  if (topMatches.length === 0) return null;

  // Assign background color based on drop or dominant pct
  const getTileColor = (match: ScrapedMatch) => {
    const minDrop = Math.min(match.drop_1_pct, match.drop_2_pct, match.drop_x_pct);
    if (minDrop <= -12) return 'bg-[#7A1818] hover:bg-[#681414] text-white'; // Darkest Red
    if (minDrop <= -6) return 'bg-[#C53939] hover:bg-[#B03232] text-white';  // Vibrant Red
    if (minDrop < 0) return 'bg-[#E35D5D] hover:bg-[#D44E4E] text-white';   // Coral Red
    if (match.dominant_pct >= 75) return 'bg-[#18683D] hover:bg-[#135431] text-white'; // Deep Green
    if (match.dominant_pct >= 60) return 'bg-[#2E8B57] hover:bg-[#257348] text-white'; // Medium Green
    return 'bg-[#43A047] hover:bg-[#388E3C] text-white'; // Fresh Green
  };

  const getTileChange = (match: ScrapedMatch) => {
    const minDrop = Math.min(match.drop_1_pct, match.drop_2_pct, match.drop_x_pct);
    if (minDrop !== 0) {
      return minDrop < 0 ? `↓ ${Math.abs(minDrop)}%` : `↑ ${minDrop}%`;
    }
    return `${match.dominant_pct}%`;
  };

  // 1st and 2nd matches get prominent large tiles, others fill the grid
  const m0 = topMatches[0];
  const m1 = topMatches[1];
  const m2 = topMatches[2];
  const m3 = topMatches[3];
  const m4 = topMatches[4];
  const m5 = topMatches[5];
  const others = topMatches.slice(6, 16);

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 mb-5 shadow-xs border border-slate-100">
      
      {/* Header */}
      <h3 className="text-sm sm:text-base font-bold text-[#0088CC] mb-3">
        Market heatmap
      </h3>

      {/* Heatmap Grid matching Screenshot 2 */}
      <div className="grid grid-cols-6 gap-1.5 h-80 sm:h-96 lg:h-[460px] select-none">
        
        {/* Large Tile 1 (left column, span 2 cols, span 4 rows) */}
        {m0 && (
          <button
            onClick={() => onSelectMatch(m0)}
            className={`col-span-2 row-span-4 rounded-xl p-2.5 flex flex-col justify-center items-center text-center cursor-pointer transition-transform active:scale-98 ${getTileColor(m0)}`}
          >
            <span className="text-xs sm:text-sm font-extrabold block leading-tight truncate max-w-full">
              {m0.home.slice(0, 7)}
            </span>
            <span className="text-[11px] font-mono font-semibold block mt-1">
              {getTileChange(m0)}
            </span>
            <span className="text-[9px] font-mono opacity-80 mt-1">
              £{Math.round(m0.total_volume / 1000)}k
            </span>
          </button>
        )}

        {/* Medium Tile 2 (span 2 cols, span 2 rows) */}
        {m1 && (
          <button
            onClick={() => onSelectMatch(m1)}
            className={`col-span-2 row-span-2 rounded-xl p-2 flex flex-col justify-center items-center text-center cursor-pointer transition-transform active:scale-98 ${getTileColor(m1)}`}
          >
            <span className="text-xs font-bold block leading-tight truncate max-w-full">
              {m1.home.slice(0, 6)}
            </span>
            <span className="text-[10px] font-mono font-semibold block mt-0.5">
              {getTileChange(m1)}
            </span>
          </button>
        )}

        {/* Medium Tile 3 */}
        {m2 && (
          <button
            onClick={() => onSelectMatch(m2)}
            className={`col-span-1 row-span-2 rounded-xl p-1.5 flex flex-col justify-center items-center text-center cursor-pointer transition-transform active:scale-98 ${getTileColor(m2)}`}
          >
            <span className="text-[10px] font-bold block truncate max-w-full">
              {m2.home.slice(0, 4)}
            </span>
            <span className="text-[9px] font-mono font-semibold block mt-0.5">
              {getTileChange(m2)}
            </span>
          </button>
        )}

        {/* Medium Tile 4 */}
        {m3 && (
          <button
            onClick={() => onSelectMatch(m3)}
            className={`col-span-1 row-span-2 rounded-xl p-1.5 flex flex-col justify-center items-center text-center cursor-pointer transition-transform active:scale-98 ${getTileColor(m3)}`}
          >
            <span className="text-[10px] font-bold block truncate max-w-full">
              {m3.home.slice(0, 4)}
            </span>
            <span className="text-[9px] font-mono font-semibold block mt-0.5">
              {getTileChange(m3)}
            </span>
          </button>
        )}

        {/* Tile 5 */}
        {m4 && (
          <button
            onClick={() => onSelectMatch(m4)}
            className={`col-span-2 row-span-2 rounded-xl p-2 flex flex-col justify-center items-center text-center cursor-pointer transition-transform active:scale-98 ${getTileColor(m4)}`}
          >
            <span className="text-xs font-bold block truncate max-w-full">
              {m4.away.slice(0, 6)}
            </span>
            <span className="text-[10px] font-mono font-semibold block mt-0.5">
              {getTileChange(m4)}
            </span>
          </button>
        )}

        {/* Small Mosaic Tiles for Remaining Matches */}
        {others.slice(0, 8).map((m, idx) => (
          <button
            key={m.id || idx}
            onClick={() => onSelectMatch(m)}
            className={`col-span-1 row-span-1 rounded-lg p-1 flex flex-col justify-center items-center text-center cursor-pointer transition-transform active:scale-95 ${getTileColor(m)}`}
          >
            <span className="text-[9px] font-bold block truncate max-w-full">
              {m.home.slice(0, 4)}
            </span>
            <span className="text-[8px] font-mono font-semibold block">
              {getTileChange(m)}
            </span>
          </button>
        ))}

        {/* Large Tile 6 (bottom left span 2 cols, span 2 rows) */}
        {m5 && (
          <button
            onClick={() => onSelectMatch(m5)}
            className={`col-span-2 row-span-2 rounded-xl p-2 flex flex-col justify-center items-center text-center cursor-pointer transition-transform active:scale-98 ${getTileColor(m5)}`}
          >
            <span className="text-xs font-bold block truncate max-w-full">
              {m5.home.slice(0, 6)}
            </span>
            <span className="text-[10px] font-mono font-semibold block mt-0.5">
              {getTileChange(m5)}
            </span>
            <span className="text-[9px] font-mono opacity-80">
              £{Math.round(m5.total_volume / 1000)}k
            </span>
          </button>
        )}

      </div>

      {/* Explanatory Caption verbatim from Screenshot 2 */}
      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        The size shows volume, color shows price change — darker means a bigger move.
      </p>

    </div>
  );
};
