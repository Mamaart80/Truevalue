import React, { useState } from 'react';
import { ScrapedMatch } from '../types';
import { ChevronDown } from 'lucide-react';

interface ActivityGrowthChartProps {
  matches: ScrapedMatch[];
  onSelectMatch: (match: ScrapedMatch) => void;
  selectedMatchId?: string;
}

export const ActivityGrowthChart: React.FC<ActivityGrowthChartProps> = ({
  matches,
  onSelectMatch,
  selectedMatchId,
}) => {
  const [filterMode, setFilterMode] = useState<'top12' | 'whales' | 'drops'>('top12');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter 12-14 matches to render clean vertical pillars like the reference image
  const displayMatches = React.useMemo(() => {
    let list = [...matches];
    if (filterMode === 'whales') {
      list = list.filter(m => m.signal_type === 'WHALE_ACCUMULATION' || m.dominant_pct >= 75);
    } else if (filterMode === 'drops') {
      list = list.filter(m => m.drop_1_pct <= -5 || m.drop_2_pct <= -5 || m.drop_x_pct <= -5);
    }
    // Sort by total volume
    list.sort((a, b) => b.total_volume - a.total_volume);
    return list.slice(0, 14);
  }, [matches, filterMode]);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.05)] border border-slate-100/80 mb-6">
      
      {/* Header with Title and Dropdown */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Flux & Répartition 1X2
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Pourcentage des volumes réels échangés par issue
          </p>
        </div>

        {/* Dropdown pill */}
        <div className="relative inline-block">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium pl-3 pr-7 py-1.5 rounded-xl border border-slate-200/70 focus:outline-none cursor-pointer transition-colors"
          >
            <option value="top12">Top Liquidité</option>
            <option value="whales">Whales (&gt;75%)</option>
            <option value="drops">Chutes de Cotes</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative w-full h-[230px] flex">
        {/* Y-Axis scale ticks */}
        <div className="w-9 flex flex-col justify-between text-[11px] font-mono text-slate-500 py-2 select-none">
          <span>80%</span>
          <span>60%</span>
          <span>40%</span>
          <span>20%</span>
          <span>0%</span>
        </div>

        {/* Vertical Pillars Grid */}
        <div className="flex-1 flex items-end justify-between gap-1 sm:gap-2 px-1 sm:px-2 relative">
          
          {/* Subtle horizontal grid lines */}
          <div className="absolute inset-x-0 top-[10%] border-b border-dashed border-slate-100 pointer-events-none" />
          <div className="absolute inset-x-0 top-[32%] border-b border-dashed border-slate-100 pointer-events-none" />
          <div className="absolute inset-x-0 top-[55%] border-b border-dashed border-slate-100 pointer-events-none" />
          <div className="absolute inset-x-0 top-[78%] border-b border-dashed border-slate-100 pointer-events-none" />

          {displayMatches.map((match, idx) => {
            const isSelected = selectedMatchId === match.id;
            const isHovered = hoveredIndex === idx;

            // Height scaling factor: proportional to percentage (normalized to 180px max)
            const totalH = 175;
            const h1 = Math.max(6, (match.pct_1 / 100) * totalH * 0.85);
            const hx = Math.max(6, (match.pct_x / 100) * totalH * 0.85);
            const h2 = Math.max(6, (match.pct_2 / 100) * totalH * 0.85);

            return (
              <div
                key={match.id}
                onClick={() => onSelectMatch(match)}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer group relative"
              >
                {/* Pillar stack with 3 discrete rounded pill capsules */}
                <div className={`w-2.5 sm:w-3 flex flex-col items-center justify-end gap-1.5 transition-transform duration-200 ${
                  isHovered || isSelected ? 'scale-110 -translate-y-1' : ''
                }`}>
                  
                  {/* Top segment: Issue 2 (Amber / Orange) */}
                  <div
                    style={{ height: `${h2}px` }}
                    className={`w-full rounded-full transition-all ${
                      isSelected ? 'bg-amber-600 ring-2 ring-amber-400' : 'bg-[#D97706] hover:bg-amber-700'
                    }`}
                    title={`2 (${match.away}): ${match.pct_2}%`}
                  />

                  {/* Middle segment: Issue X (Teal / Mint) */}
                  <div
                    style={{ height: `${hx}px` }}
                    className={`w-full rounded-full transition-all ${
                      isSelected ? 'bg-teal-600 ring-2 ring-teal-400' : 'bg-[#0F766E] hover:bg-teal-700'
                    }`}
                    title={`X (Nul): ${match.pct_x}%`}
                  />

                  {/* Bottom segment: Issue 1 (Coral / Rose) */}
                  <div
                    style={{ height: `${h1}px` }}
                    className={`w-full rounded-full transition-all ${
                      isSelected ? 'bg-rose-600 ring-2 ring-rose-400' : 'bg-[#BE123C] hover:bg-rose-700'
                    }`}
                    title={`1 (${match.home}): ${match.pct_1}%`}
                  />
                </div>

                {/* X-axis label (Match short code) */}
                <span className="text-[10px] text-slate-600 font-medium mt-2 truncate max-w-[34px] sm:max-w-[48px] text-center select-none group-hover:text-slate-900 group-hover:font-bold">
                  {match.home.slice(0, 3)}
                </span>

                {/* Hover Tooltip Box */}
                {isHovered && (
                  <div className="absolute bottom-16 z-30 bg-slate-900 text-white rounded-xl py-2 px-3 shadow-xl text-left pointer-events-none min-w-[150px] -translate-x-1/2 left-1/2">
                    <p className="text-[11px] font-bold truncate">{match.home} vs {match.away}</p>
                    <p className="text-[10px] text-slate-400 truncate mb-1.5">{match.league}</p>
                    <div className="space-y-0.5 text-[10px] font-mono">
                      <div className="flex justify-between text-rose-300">
                        <span>1 (Dom):</span>
                        <span>{match.pct_1}%</span>
                      </div>
                      <div className="flex justify-between text-teal-300">
                        <span>X (Nul):</span>
                        <span>{match.pct_x}%</span>
                      </div>
                      <div className="flex justify-between text-amber-300">
                        <span>2 (Ext):</span>
                        <span>{match.pct_2}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend below chart (Matching Aerobics • Yoga • Meditation) */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#BE123C]" />
          <span>1 • Victoire Domicile</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0F766E]" />
          <span>X • Match Nul</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]" />
          <span>2 • Victoire Extérieur</span>
        </div>
      </div>

    </div>
  );
};
