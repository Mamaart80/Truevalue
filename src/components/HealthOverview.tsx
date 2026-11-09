import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Coins, 
  TrendingDown, 
  Zap, 
  RefreshCw, 
  Calendar as CalendarIcon, 
  Sparkles,
  ArrowRight,
  Layers,
  ExternalLink,
  ChevronRight,
  Info,
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon,
  Play,
  Pause,
  Clock,
  Flame,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { ScrapedMatch, MarketKey } from '../types';
import { Sparkline } from './Sparkline';
import { ActivityGrowthChart } from './ActivityGrowthChart';
import { FilterView } from './NavigationRail';
import { MarketSelector } from './MarketSelector';
import { getMarketDef } from '../data/markets';

export type SortField = 'volume' | 'pct' | 'drop' | 'smart' | 'date';
export type SortOrder = 'desc' | 'asc';

interface HealthOverviewProps {
  matches: ScrapedMatch[];
  isLoading: boolean;
  onRefresh: () => void;
  lastUpdated: string | null;
  onSelectMatch: (match: ScrapedMatch) => void;
  selectedMatchId?: string;
  onOpenAiModal: (match: ScrapedMatch) => void;
  currentView: FilterView;
  onViewChange: (view: FilterView) => void;
  selectedMarket: MarketKey;
  onSelectMarket: (marketKey: MarketKey) => void;
  marketSummaries?: Record<string, { count: number; volume: number }>;
  // Auto-refresh props
  autoRefreshInterval?: number;
  onSetAutoRefreshInterval?: (seconds: number) => void;
  secondsUntilRefresh?: number;
  isAutoRefreshPaused?: boolean;
  onTogglePauseAutoRefresh?: () => void;
}

export const HealthOverview: React.FC<HealthOverviewProps> = ({
  matches,
  isLoading,
  onRefresh,
  lastUpdated,
  onSelectMatch,
  selectedMatchId,
  onOpenAiModal,
  currentView,
  onViewChange,
  selectedMarket,
  onSelectMarket,
  marketSummaries = {},
  autoRefreshInterval = 45,
  onSetAutoRefreshInterval,
  secondsUntilRefresh,
  isAutoRefreshPaused = false,
  onTogglePauseAutoRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sorting & Display mode
  const [sortField, setSortField] = useState<SortField>('volume');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>(() => {
    try {
      return (localStorage.getItem('moneyway_display_mode') as 'cards' | 'table') || 'cards';
    } catch {
      return 'cards';
    }
  });

  const toggleDisplayMode = (mode: 'cards' | 'table') => {
    setDisplayMode(mode);
    try {
      localStorage.setItem('moneyway_display_mode', mode);
    } catch {}
  };

  // Keyboard shortcut listener: press '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const marketDef = getMarketDef(selectedMarket);
  const isTwoWay = marketDef.type === '2_way';
  const isMulti = marketDef.type === 'multi';

  // Exact Sums and Volume Calculations
  const totalVolume = useMemo(() => matches.reduce((sum, m) => sum + m.total_volume, 0), [matches]);
  const totalVol1 = useMemo(() => matches.reduce((sum, m) => sum + m.volume_1, 0), [matches]);
  const totalVolX = useMemo(() => matches.reduce((sum, m) => sum + (m.volume_x || 0), 0), [matches]);
  const totalVol2 = useMemo(() => matches.reduce((sum, m) => sum + m.volume_2, 0), [matches]);

  const pctTotal1 = totalVolume > 0 ? ((totalVol1 / totalVolume) * 100).toFixed(1) : '0.0';
  const pctTotalX = totalVolume > 0 && !isTwoWay ? ((totalVolX / totalVolume) * 100).toFixed(1) : '0.0';
  const pctTotal2 = totalVolume > 0 ? ((totalVol2 / totalVolume) * 100).toFixed(1) : '0.0';

  const whaleCount = useMemo(() => matches.filter(m => m.dominant_pct >= 75 || m.total_volume >= 15000).length, [matches]);
  const dropCount = useMemo(() => matches.filter(m => m.drop_1_pct <= -5 || m.drop_2_pct <= -5 || m.drop_x_pct <= -5).length, [matches]);

  // Find biggest odds drop
  const maxDrop = useMemo(() => {
    let drop = 0;
    for (const m of matches) {
      if (m.drop_1_pct < drop) drop = m.drop_1_pct;
      if (m.drop_2_pct < drop) drop = m.drop_2_pct;
      if (m.drop_x_pct < drop) drop = m.drop_x_pct;
    }
    return drop;
  }, [matches]);

  const formatMoney = (num: number) => {
    return '£' + Math.round(num).toLocaleString('en-GB');
  };

  // Filtered & Sorted matches
  const filteredMatches = useMemo(() => {
    const list = matches.filter(m => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!`${m.home} ${m.away} ${m.league} ${m.country}`.toLowerCase().includes(q)) return false;
      }
      if (currentView === 'whales') {
        return m.dominant_pct >= 75 || m.total_volume >= 10000;
      }
      if (currentView === 'drops') {
        return m.drop_1_pct <= -5 || m.drop_2_pct <= -5 || m.drop_x_pct <= -5;
      }
      return true;
    });

    list.sort((a, b) => {
      let diff = 0;
      if (sortField === 'volume') {
        diff = b.total_volume - a.total_volume;
      } else if (sortField === 'pct') {
        diff = b.dominant_pct - a.dominant_pct;
      } else if (sortField === 'drop') {
        const dropA = Math.min(a.drop_1_pct, a.drop_2_pct, a.drop_x_pct);
        const dropB = Math.min(b.drop_1_pct, b.drop_2_pct, b.drop_x_pct);
        diff = dropA - dropB; // Most negative drop first
      } else if (sortField === 'smart') {
        diff = b.smart_money_score - a.smart_money_score;
      } else if (sortField === 'date') {
        diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return sortOrder === 'desc' ? diff : -diff;
    });

    return list;
  }, [matches, searchQuery, currentView, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="flex-1 bg-[#FBFBFD] p-3.5 sm:p-6 lg:p-7 rounded-3xl lg:rounded-l-none overflow-y-auto">
      
      {/* Top Header: Title, Date, Auto-refresh indicator, Search & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Moneyway {marketDef.shortLabel}
            </h1>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${marketDef.badgeColor}`}>
              {marketDef.label}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <CalendarIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>Flux officiels Arbworld & Betfair Exchange</span>
            {lastUpdated && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-emerald-600 font-semibold">{lastUpdated}</span>
              </>
            )}
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-medium">{marketDef.helpText}</span>
          </p>
        </div>

        {/* Action Controls & Auto-Refresh Pill */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Auto-Refresh Timer Indicator */}
          {onSetAutoRefreshInterval && secondsUntilRefresh !== undefined && (
            <div className="flex items-center bg-white border border-slate-200/80 rounded-2xl px-2.5 py-1 shadow-xs text-xs">
              <button
                onClick={onTogglePauseAutoRefresh}
                className="text-slate-500 hover:text-slate-800 mr-1.5"
                title={isAutoRefreshPaused ? 'Reprendre la synchronisation auto' : 'Mettre en pause la synchronisation auto'}
              >
                {isAutoRefreshPaused ? (
                  <Play className="h-3 w-3 text-amber-500 fill-amber-500" />
                ) : (
                  <Pause className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                )}
              </button>

              <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-700">
                <Clock className="h-3 w-3 text-emerald-500 shrink-0" />
                <span>
                  {autoRefreshInterval > 0 
                    ? (isAutoRefreshPaused ? 'Pause' : `${secondsUntilRefresh}s`)
                    : 'Manuel'}
                </span>
              </div>

              <select
                aria-label="Intervalle de synchronisation"
                value={autoRefreshInterval}
                onChange={(e) => onSetAutoRefreshInterval(Number(e.target.value))}
                className="ml-1.5 bg-transparent text-[10px] text-slate-500 font-medium border-0 focus:ring-0 cursor-pointer p-0"
              >
                <option value={30}>30s</option>
                <option value={45}>45s</option>
                <option value={60}>60s</option>
                <option value={120}>2m</option>
                <option value={0}>Manuel</option>
              </select>
            </div>
          )}

          {/* Search Bar / Button */}
          {isSearchOpen ? (
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                placeholder="Équipe, ligue... (raccourci /)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-slate-200 text-xs text-slate-800 rounded-full pl-8 pr-7 py-2 focus:outline-none focus:border-amber-400 shadow-sm w-44 sm:w-60"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <button 
                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className="h-9 px-3 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-xs transition-all text-xs font-medium cursor-pointer"
              title="Rechercher (Touche /)"
            >
              <Search className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline text-slate-500">Rechercher</span>
              <kbd className="hidden md:inline bg-slate-100 text-slate-400 text-[10px] px-1.5 py-0.5 rounded border border-slate-200 font-mono">/</kbd>
            </button>
          )}

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`h-9 px-3 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-xs transition-all text-xs font-semibold cursor-pointer ${
              isLoading ? 'opacity-80' : 'active:scale-95'
            }`}
            title="Rafraîchir les flux en direct"
          >
            <RefreshCw className={`h-4 w-4 text-slate-700 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* Market Selector Pill Bar */}
      <MarketSelector
        selectedMarket={selectedMarket}
        onSelectMarket={onSelectMarket}
        marketSummaries={marketSummaries}
        isLoading={isLoading}
      />

      {/* Global Total Sums Banner (Adapts dynamically to 2-way vs 3-way markets) */}
      <div className="bg-white rounded-2xl p-4 mb-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total des Sommes Échangées • Marché {marketDef.shortLabel}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-0.5">
              {formatMoney(totalVolume)}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              {matches.length} Matchs cotés
            </span>
            <span className="text-xs font-mono text-slate-500">
              Moyenne : {formatMoney(totalVolume / (matches.length || 1))} / match
            </span>
          </div>
        </div>

        {/* Dynamic Macro Split based on Market Type */}
        {isTwoWay ? (
          // 2-Way Grid (Over/Under, BTTS, DNB)
          <div className="grid grid-cols-2 gap-2 mt-3 pt-1 text-center">
            <div className="bg-[#FFEBEF]/40 border border-rose-100 rounded-xl p-2.5">
              <span className="text-[11px] text-rose-700 font-bold block truncate">{marketDef.labels.opt1}</span>
              <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900 block mt-0.5">
                {formatMoney(totalVol1)}
              </span>
              <span className="text-xs font-mono text-rose-700 font-bold">{pctTotal1}%</span>
            </div>

            <div className="bg-[#E8F8F5]/40 border border-teal-100 rounded-xl p-2.5">
              <span className="text-[11px] text-teal-700 font-bold block truncate">{marketDef.labels.opt2}</span>
              <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900 block mt-0.5">
                {formatMoney(totalVol2)}
              </span>
              <span className="text-xs font-mono text-teal-700 font-bold">{pctTotal2}%</span>
            </div>
          </div>
        ) : isMulti ? (
          // Multi Grid (Correct Score)
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 mt-3 text-center flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">
              Volume total consolidé sur les scores exacts
            </span>
            <span className="font-mono font-extrabold text-sm text-slate-900">
              {formatMoney(totalVolume)}
            </span>
          </div>
        ) : (
          // 3-Way Grid (1X2, Double Chance, Half Time)
          <div className="grid grid-cols-3 gap-2 mt-3 pt-1 text-center">
            <div className="bg-[#FFEBEF]/40 border border-rose-100 rounded-xl p-2">
              <span className="text-[10px] text-rose-600 font-bold block truncate">{marketDef.labels.opt1}</span>
              <span className="font-mono font-extrabold text-xs sm:text-sm text-slate-900 block mt-0.5">
                {formatMoney(totalVol1)}
              </span>
              <span className="text-[10px] font-mono text-rose-700 font-semibold">{pctTotal1}%</span>
            </div>

            <div className="bg-[#E8F8F5]/40 border border-teal-100 rounded-xl p-2">
              <span className="text-[10px] text-teal-600 font-bold block truncate">{marketDef.labels.optX || 'Nul'}</span>
              <span className="font-mono font-extrabold text-xs sm:text-sm text-slate-900 block mt-0.5">
                {formatMoney(totalVolX)}
              </span>
              <span className="text-[10px] font-mono text-teal-700 font-semibold">{pctTotalX}%</span>
            </div>

            <div className="bg-[#FFF3E8]/40 border border-amber-100 rounded-xl p-2">
              <span className="text-[10px] text-amber-600 font-bold block truncate">{marketDef.labels.opt2}</span>
              <span className="font-mono font-extrabold text-xs sm:text-sm text-slate-900 block mt-0.5">
                {formatMoney(totalVol2)}
              </span>
              <span className="text-[10px] font-mono text-amber-700 font-semibold">{pctTotal2}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Top 3 KPI Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 mb-6">
        
        {/* Card 1: Volume Traded */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-[#FFF3E8] text-[#F59E0B] flex items-center justify-center shrink-0">
                <Coins className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                Volume {marketDef.shortLabel}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                {formatMoney(totalVolume)}
              </span>
            </div>

            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F8F5] text-[#059669] border border-[#A7F3D0]/70">
                {matches.length} rencontres
              </span>
            </div>
          </div>

          <Sparkline color="amber" points={[12, 18, 15, 25, 22, 30, 28, 35, 40]} />
        </div>

        {/* Card 2: Max Drop */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-[#FFEBEF] text-[#EF4444] flex items-center justify-center shrink-0">
                <TrendingDown className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                Chute Maximale
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                {maxDrop}%
              </span>
              <span className="text-xs font-medium text-slate-500">variation max</span>
            </div>

            <div className="mt-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFEBEF] text-[#DC2626] border border-[#FECDD3]/70 inline-block">
                {dropCount} baisses actives
              </span>
            </div>
          </div>

          <Sparkline color="rose" points={[38, 35, 30, 28, 22, 18, 14, 10, 8]} />
        </div>

        {/* Card 3: Smart Money Signals */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-[#E8F8F5] text-[#10B981] flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                Smart Money
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                {whaleCount}
              </span>
              <span className="text-xs font-medium text-slate-500">alertes actives</span>
            </div>

            <div className="mt-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F8F5] text-[#059669] border border-[#A7F3D0]/70 inline-block">
                Whale Accumulation
              </span>
            </div>
          </div>

          <Sparkline color="teal" points={[14, 20, 28, 22, 34, 30, 38, 42, 45]} />
        </div>

      </div>

      {/* Segmented Rounded Vertical Bar Chart (Volume distribution across matches) */}
      <ActivityGrowthChart
        matches={matches}
        onSelectMatch={onSelectMatch}
        selectedMatchId={selectedMatchId}
      />

      {/* Interactive Quick Discovery Banner for Signals Matrix */}
      <div 
        onClick={() => onViewChange('signals')}
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/80 rounded-2xl p-3.5 sm:p-4 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-all group border border-slate-800 my-6"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-white">
                Interprétation Automatique des Signaux Croisés
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Nouveau
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Détecte les convergences (+2.5 buts, scores 2-1/1-2), propose des options sécurité (+1.5 buts) et signale les divergences.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:text-amber-300 self-end sm:self-auto shrink-0">
          <span>Ouvrir l'Analyse</span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Matches List Section with Filter Pills, Sorting, and View Switcher */}
      <div className="space-y-3 mt-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Left Title & View Counts */}
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              {currentView === 'all' && `Matchs ${marketDef.shortLabel} (${filteredMatches.length})`}
              {currentView === 'whales' && `Whales & Forts Flux (${filteredMatches.length})`}
              {currentView === 'drops' && `Chutes de Cotes (${filteredMatches.length})`}
            </h2>

            {/* Quick Filter Badges */}
            <div className="flex items-center gap-1 text-xs ml-2">
              <button
                onClick={() => onViewChange('all')}
                className={`px-2.5 py-1 rounded-xl font-medium transition-colors cursor-pointer ${
                  currentView === 'all' ? 'bg-slate-900 text-white font-bold' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Tous ({matches.length})
              </button>
              <button
                onClick={() => onViewChange('whales')}
                className={`px-2.5 py-1 rounded-xl font-medium transition-colors cursor-pointer ${
                  currentView === 'whales' ? 'bg-amber-500 text-white font-bold shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                ⚡ Whales ({whaleCount})
              </button>
              <button
                onClick={() => onViewChange('drops')}
                className={`px-2.5 py-1 rounded-xl font-medium transition-colors cursor-pointer ${
                  currentView === 'drops' ? 'bg-rose-500 text-white font-bold shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                📉 Chutes ({dropCount})
              </button>
            </div>
          </div>

          {/* Right Toolbar: Sorting & Display Mode Toggle */}
          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
            {/* Sort Dropdown / Pills */}
            <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-xl px-2 py-1 text-xs text-slate-600 shadow-xs">
              <ArrowUpDown className="h-3 w-3 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Tri:</span>
              <button
                onClick={() => handleSort('volume')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                  sortField === 'volume' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                Volume {sortField === 'volume' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => handleSort('pct')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                  sortField === 'pct' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                % Choix {sortField === 'pct' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => handleSort('drop')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                  sortField === 'drop' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                Chute {sortField === 'drop' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => handleSort('smart')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                  sortField === 'smart' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                Score {sortField === 'smart' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
            </div>

            {/* Display Mode Toggle (Cards vs Table) */}
            <div className="flex items-center bg-white border border-slate-200/80 rounded-xl p-0.5 shadow-xs">
              <button
                onClick={() => toggleDisplayMode('cards')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  displayMode === 'cards' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Vue Cartes Détaillées"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => toggleDisplayMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  displayMode === 'table' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Vue Tableau Pro Haute Densité"
              >
                <TableIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Empty state if no matches currently active in this market */}
        {filteredMatches.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200/80 shadow-xs">
            <div className="inline-flex p-3 rounded-2xl bg-amber-50 text-amber-600 mb-3">
              <Info className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Aucun match ne correspond aux critères ({marketDef.shortLabel})
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Tous les matchs ne sont pas ouverts simultanément dans ce marché. Vous pouvez réinitialiser la recherche ou basculer sur un autre marché ci-dessous :
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => { setSearchQuery(''); onViewChange('all'); }}
                className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-300 transition-all cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
              <button
                onClick={() => onSelectMarket('1x2')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all cursor-pointer"
              >
                ⚽ Voir 1X2 Résultat
              </button>
              <button
                onClick={() => onSelectMarket('over-under-2-5')}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-all cursor-pointer"
              >
                🎯 Voir Plus/Moins 2.5
              </button>
              <button
                onClick={() => onSelectMarket('btts')}
                className="px-3.5 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 transition-all cursor-pointer"
              >
                🥅 Voir Les 2 Équipes Marquent
              </button>
            </div>
          </div>
        )}

        {/* 1. COMPACT PRO TRADER TABLE VIEW */}
        {displayMode === 'table' && filteredMatches.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                    <th className="py-2.5 px-3">Date / Ligue</th>
                    <th className="py-2.5 px-3 min-w-[170px]">Rencontre</th>
                    <th className="py-2.5 px-3 text-right">Volume (£)</th>
                    <th className="py-2.5 px-3 text-center">Cotes & Variations</th>
                    <th className="py-2.5 px-3">Choix Dominant</th>
                    <th className="py-2.5 px-3 text-center">Smart Score</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredMatches.map((match) => {
                    const isSelected = selectedMatchId === match.id;

                    return (
                      <tr
                        key={match.id}
                        onClick={() => onSelectMatch(match)}
                        className={`transition-colors cursor-pointer hover:bg-slate-50/90 ${
                          isSelected ? 'bg-amber-50/70 font-semibold ring-1 ring-inset ring-amber-300' : ''
                        }`}
                      >

                        {/* Date & League */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {match.flag_url && (
                              <img 
                                src={match.flag_url} 
                                alt={match.country}
                                className="h-2.5 w-3.5 rounded-xs object-cover border border-slate-200 shrink-0" 
                              />
                            )}
                            <span className="font-semibold text-slate-800 text-[11px] max-w-[110px] truncate">{match.league}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{match.date_formatted}</span>
                        </td>

                        {/* Fixture Teams */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 text-xs truncate max-w-[200px]">
                            {match.home} <span className="text-slate-400 font-normal text-[11px]">vs</span> {match.away}
                          </div>
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full border mt-0.5 ${match.signal_color}`}>
                            {match.signal_label}
                          </span>
                        </td>

                        {/* Total Volume */}
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                          {formatMoney(match.total_volume)}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {match.liquidity_tier}
                          </span>
                        </td>

                        {/* Odds & Drops */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-2 font-mono text-[11px]">
                            {/* Option 1 */}
                            <div className="text-center px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100">
                              <span className="text-[9px] text-slate-400 block">{match.label_1}</span>
                              <span className="font-bold text-slate-800">@{match.coef_1_new.toFixed(2)}</span>
                              {match.drop_1_pct !== 0 && (
                                <span className={`text-[9px] block font-semibold ${match.drop_1_pct < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {match.drop_1_pct > 0 ? `+${match.drop_1_pct}%` : `${match.drop_1_pct}%`}
                                </span>
                              )}
                            </div>

                            {/* Option X (if 3-way) */}
                            {!isTwoWay && !isMulti && (
                              <div className="text-center px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100">
                                <span className="text-[9px] text-slate-400 block">{match.label_x || 'Nul'}</span>
                                <span className="font-bold text-slate-800">@{match.coef_x_new.toFixed(2)}</span>
                                {match.drop_x_pct !== 0 && (
                                  <span className={`text-[9px] block font-semibold ${match.drop_x_pct < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {match.drop_x_pct > 0 ? `+${match.drop_x_pct}%` : `${match.drop_x_pct}%`}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Option 2 */}
                            {!isMulti && (
                              <div className="text-center px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100">
                                <span className="text-[9px] text-slate-400 block">{match.label_2}</span>
                                <span className="font-bold text-slate-800">@{match.coef_2_new.toFixed(2)}</span>
                                {match.drop_2_pct !== 0 && (
                                  <span className={`text-[9px] block font-semibold ${match.drop_2_pct < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {match.drop_2_pct > 0 ? `+${match.drop_2_pct}%` : `${match.drop_2_pct}%`}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Dominant Pick & Percentage */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-xs">
                              {match.dominant_outcome}
                            </span>
                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px]">
                              {match.dominant_pct}%
                            </span>
                          </div>
                          <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, match.dominant_pct)}%` }}
                            />
                          </div>
                        </td>

                        {/* Smart Score */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                            match.smart_money_score >= 70 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                              : match.smart_money_score >= 50
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {match.smart_money_score}/100
                          </span>
                        </td>

                        {/* Actions: AI + Betfair link */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenAiModal(match)}
                              className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300/60 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Analyse IA Complète"
                            >
                              <Sparkles className="h-3 w-3 text-amber-600" />
                              <span>IA</span>
                            </button>
                            <a
                              href={match.betfair_market_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              title="Voir sur Betfair Exchange"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. RICH CARDS GRID VIEW */}
        {displayMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredMatches.map((match) => {
              const isSelected = selectedMatchId === match.id;

              return (
                <div
                  key={match.id}
                  onClick={() => onSelectMatch(match)}
                  className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer relative hover:shadow-md ${
                    isSelected 
                      ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-sm' 
                      : 'border-slate-100 hover:border-slate-300'
                  }`}
                >
                  {/* Header: Date & League */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                    <div className="flex items-center gap-1.5 truncate">
                      {match.flag_url && (
                        <img 
                          src={match.flag_url} 
                          alt={match.country}
                          className="h-3 w-4 rounded-xs object-cover border border-slate-200 shrink-0" 
                        />
                      )}
                      <span className="font-semibold text-slate-700 truncate max-w-[130px]">{match.league}</span>
                      <span>•</span>
                      <span className="font-mono">{match.date_formatted}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${match.signal_color}`}>
                        {match.signal_label}
                      </span>
                    </div>
                  </div>

                  {/* Match Teams & Total Sum of the Match */}
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {match.home} <span className="text-slate-400 font-normal text-xs">vs</span> {match.away}
                    </span>
                    
                    {/* Somme Totale du Match */}
                    <div className="bg-slate-900 text-white font-mono px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 shadow-xs">
                      {formatMoney(match.total_volume)}
                    </div>
                  </div>

                  {/* ADAPTIVE BOXES BASED ON MARKET TYPE */}
                  {isTwoWay ? (
                    // 2-Way Comparison (Over/Under, BTTS, DNB)
                    <div className="grid grid-cols-2 gap-2 mb-2.5">
                      
                      {/* Option 1 */}
                      <div className={`p-2.5 rounded-xl border text-center transition-all ${
                        match.dominant_outcome === match.label_1 
                          ? 'bg-[#FFEBEF]/50 border-rose-300 ring-1 ring-rose-200' 
                          : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold mb-0.5">
                          <span className="truncate">{match.label_1}</span>
                          <span className="text-rose-700 font-bold font-mono">{match.pct_1}%</span>
                        </div>
                        <div className="font-mono font-bold text-xs text-slate-900">
                          @{match.coef_1_new.toFixed(2)}
                        </div>
                        <div className="text-[11px] font-mono font-extrabold text-slate-800 mt-1 bg-white/80 py-0.5 rounded shadow-xs">
                          {formatMoney(match.volume_1)}
                        </div>
                      </div>

                      {/* Option 2 */}
                      <div className={`p-2.5 rounded-xl border text-center transition-all ${
                        match.dominant_outcome === match.label_2 
                          ? 'bg-[#E8F8F5]/50 border-teal-300 ring-1 ring-teal-200' 
                          : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold mb-0.5">
                          <span className="truncate">{match.label_2}</span>
                          <span className="text-teal-700 font-bold font-mono">{match.pct_2}%</span>
                        </div>
                        <div className="font-mono font-bold text-xs text-slate-900">
                          @{match.coef_2_new.toFixed(2)}
                        </div>
                        <div className="text-[11px] font-mono font-extrabold text-slate-800 mt-1 bg-white/80 py-0.5 rounded shadow-xs">
                          {formatMoney(match.volume_2)}
                        </div>
                      </div>

                    </div>
                  ) : isMulti ? (
                    // Multi Comparison (Correct Score)
                    <div className="mb-2.5 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Scores les plus tradés
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {match.outcomes?.slice(0, 3).map((out, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-center">
                            <span className="text-xs font-bold text-slate-800 block">{out.label}</span>
                            <span className="text-[10px] font-mono text-emerald-600 block">@{out.coef_new?.toFixed(2) || '—'}</span>
                            <span className="text-[10px] font-mono text-slate-500 block font-semibold">{formatMoney(out.volume)}</span>
                          </div>
                        )) || (
                          <div className="col-span-3 text-center text-xs text-slate-400 py-1">
                            Flux répartis sur les scores
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // 3-Way Comparison (1X2, Double Chance, Half Time)
                    <div className="grid grid-cols-3 gap-2 mb-2.5">
                      
                      {/* Option 1 */}
                      <div className={`p-2 rounded-xl border text-center transition-all ${
                        match.dominant_outcome === match.label_1 || match.dominant_outcome === '1'
                          ? 'bg-[#FFEBEF]/50 border-rose-300 ring-1 ring-rose-200' 
                          : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-0.5">
                          <span className="truncate">{match.label_1}</span>
                          <span className="text-rose-700 font-bold">{match.pct_1}%</span>
                        </div>
                        <div className="font-mono font-bold text-xs text-slate-900">
                          @{match.coef_1_new.toFixed(2)}
                        </div>
                        <div className="text-[11px] font-mono font-extrabold text-slate-800 mt-1 bg-white/80 py-0.5 rounded shadow-xs">
                          {formatMoney(match.volume_1)}
                        </div>
                      </div>

                      {/* Option X */}
                      <div className={`p-2 rounded-xl border text-center transition-all ${
                        match.dominant_outcome === match.label_x || match.dominant_outcome === 'X'
                          ? 'bg-[#E8F8F5]/50 border-teal-300 ring-1 ring-teal-200' 
                          : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-0.5">
                          <span className="truncate">{match.label_x || 'Nul'}</span>
                          <span className="text-teal-700 font-bold">{match.pct_x}%</span>
                        </div>
                        <div className="font-mono font-bold text-xs text-slate-900">
                          @{match.coef_x_new.toFixed(2)}
                        </div>
                        <div className="text-[11px] font-mono font-extrabold text-slate-800 mt-1 bg-white/80 py-0.5 rounded shadow-xs">
                          {formatMoney(match.volume_x)}
                        </div>
                      </div>

                      {/* Option 2 */}
                      <div className={`p-2 rounded-xl border text-center transition-all ${
                        match.dominant_outcome === match.label_2 || match.dominant_outcome === '2'
                          ? 'bg-[#FFF3E8]/50 border-amber-300 ring-1 ring-amber-200' 
                          : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-0.5">
                          <span className="truncate">{match.label_2}</span>
                          <span className="text-amber-700 font-bold">{match.pct_2}%</span>
                        </div>
                        <div className="font-mono font-bold text-xs text-slate-900">
                          @{match.coef_2_new.toFixed(2)}
                        </div>
                        <div className="text-[11px] font-mono font-extrabold text-slate-800 mt-1 bg-white/80 py-0.5 rounded shadow-xs">
                          {formatMoney(match.volume_2)}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Footer Bar: AI Analysis Button + Betfair Chart Link */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAiModal(match);
                        }}
                        className="flex items-center gap-1.5 font-bold text-slate-800 hover:text-amber-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-amber-50 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span>Analyse IA & Multi-Marchés</span>
                      </button>
                    </div>

                    <a
                      href={match.betfair_market_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors flex items-center gap-1 text-[11px]"
                      title="Voir sur Betfair Exchange"
                    >
                      <span>Betfair</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
