import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  RefreshCw, 
  Target, 
  Goal, 
  Layers, 
  ExternalLink, 
  CheckCircle2, 
  Brain,
  ShieldAlert,
  Search,
  ArrowRight,
  Filter,
  Info,
  Trophy
} from 'lucide-react';
import { CrossMarketSignal, SignalCategory, MarketKey, ScrapedMatch } from '../types';
import { getMarketDef } from '../data/markets';

interface SignalsIntelligenceViewProps {
  signals: CrossMarketSignal[];
  isLoading: boolean;
  onRefresh: () => void;
  lastUpdated: string | null;
  onSelectMatch?: (match: ScrapedMatch) => void;
  onOpenAiModal?: (match: ScrapedMatch) => void;
}

export const SignalsIntelligenceView: React.FC<SignalsIntelligenceViewProps> = ({
  signals,
  isLoading,
  onRefresh,
  lastUpdated,
  onSelectMatch,
  onOpenAiModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [analyzingSignalId, setAnalyzingSignalId] = useState<string | null>(null);
  const [aiAnalyses, setAiAnalyses] = useState<Record<string, any>>({});
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [liveScores, setLiveScores] = useState<Record<string, { loading: boolean; match?: any }>>({});

  const handleCheckScore = async (signal: CrossMarketSignal) => {
    setLiveScores(prev => ({ ...prev, [signal.id]: { loading: true } }));
    try {
      const res = await fetch(`/api/results/match?home=${encodeURIComponent(signal.home)}&away=${encodeURIComponent(signal.away)}`);
      const data = await res.json();
      setLiveScores(prev => ({ ...prev, [signal.id]: { loading: false, match: data.match || null } }));
    } catch {
      setLiveScores(prev => ({ ...prev, [signal.id]: { loading: false, match: null } }));
    }
  };

  // Statistics
  const totalAnalyzed = signals.length;
  const countOver = useMemo(() => signals.filter(s => s.category === 'CONVERGENCE_OVER').length, [signals]);
  const countUnder = useMemo(() => signals.filter(s => s.category === 'CONVERGENCE_UNDER').length, [signals]);
  const countDivergence = useMemo(() => signals.filter(s => s.category === 'DIVERGENCE_WARNING').length, [signals]);
  const avgConvergence = useMemo(() => {
    if (signals.length === 0) return 0;
    return Math.round(signals.reduce((acc, s) => acc + s.convergence_score, 0) / signals.length);
  }, [signals]);

  const filteredSignals = useMemo(() => {
    return signals.filter(s => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!`${s.home} ${s.away} ${s.league}`.toLowerCase().includes(q)) return false;
      }
      if (selectedCategory === 'OVER') return s.category === 'CONVERGENCE_OVER';
      if (selectedCategory === 'UNDER') return s.category === 'CONVERGENCE_UNDER';
      if (selectedCategory === 'DIVERGENCE') return s.category === 'DIVERGENCE_WARNING';
      if (selectedCategory === 'FAVORITE') return s.category === 'CONVERGENCE_FAVORITE';
      return true;
    });
  }, [signals, searchQuery, selectedCategory]);

  const formatMoney = (num: number) => '£' + Math.round(num).toLocaleString('en-GB');

  // Trigger on-demand AI analysis for a specific signal
  const handleAnalyzeWithAi = async (signal: CrossMarketSignal) => {
    if (aiAnalyses[signal.id]) {
      setExpandedSignalId(expandedSignalId === signal.id ? null : signal.id);
      return;
    }

    setAnalyzingSignalId(signal.id);
    setExpandedSignalId(signal.id);

    try {
      const res = await fetch('/api/ai/analyze-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal }),
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setAiAnalyses(prev => ({ ...prev, [signal.id]: data.analysis }));
      }
    } catch (err) {
      console.error('Error fetching signal AI analysis:', err);
    } finally {
      setAnalyzingSignalId(null);
    }
  };

  return (
    <div className="flex-1 bg-[#FBFBFD] p-3.5 sm:p-6 lg:p-7 rounded-3xl lg:rounded-l-none overflow-y-auto">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 font-bold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Interprétation des Signaux Croisés
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Matrice d'arbitrage et détection automatique de convergence / divergence entre marchés
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {lastUpdated && (
            <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 font-semibold">
              Mis à jour : {lastUpdated}
            </span>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`h-9 w-9 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-xs transition-all cursor-pointer ${
              isLoading ? 'opacity-80' : 'active:scale-95'
            }`}
            title="Rafraîchir les flux et recalculer la matrice"
          >
            <RefreshCw className={`h-4 w-4 text-slate-700 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top 4 Synthesis Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        
        {/* Card 1: Convergence Offensive */}
        <div 
          onClick={() => setSelectedCategory('OVER')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'OVER'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold mb-1">
            <span>🎯 Convergence +Buts</span>
            <Target className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {countOver}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Flux alignés sur l'Over (+2.5 / +1.5 buts)
          </p>
        </div>

        {/* Card 2: Convergence Défensive */}
        <div 
          onClick={() => setSelectedCategory('UNDER')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'UNDER'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-800 font-bold mb-1">
            <span>🛡️ Convergence -Buts</span>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {countUnder}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Flux alignés sur l'Under (-2.5 / -3.5 buts)
          </p>
        </div>

        {/* Card 3: Alertes Divergence (Pièges) */}
        <div 
          onClick={() => setSelectedCategory('DIVERGENCE')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'DIVERGENCE'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-800 font-bold mb-1">
            <span>⚠️ Alertes Divergence</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {countDivergence}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Marchés en contradiction
          </p>
        </div>

        {/* Card 4: Taux de Convergence Moyen */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80">
          <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-1">
            <span>Indice Moyen de Consensus</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {avgConvergence}%
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Cohérence globale des flux
          </p>
        </div>

      </div>

      {/* 3. Search and Quick Filter Bar */}
      <div className="bg-white rounded-2xl p-3 mb-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tous les Signaux ({signals.length})
          </button>

          <button
            onClick={() => setSelectedCategory('OVER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'OVER'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🎯 +Buts ({countOver})
          </button>

          <button
            onClick={() => setSelectedCategory('UNDER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'UNDER'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🛡️ -Buts ({countUnder})
          </button>

          <button
            onClick={() => setSelectedCategory('DIVERGENCE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'DIVERGENCE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⚠️ Divergences & Pièges ({countDivergence})
          </button>

          <button
            onClick={() => setSelectedCategory('FAVORITE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'FAVORITE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⚡ Consensus Favori
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher une équipe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-amber-400 w-full sm:w-48"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      {/* 4. Signals Cards Feed */}
      {filteredSignals.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-slate-500 border border-slate-200/80">
          <Info className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">Aucun signal ne correspond aux critères</h3>
          <p className="text-xs text-slate-500 mt-1">Sélectionnez "Tous les signaux" ou modifiez votre recherche.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSignals.map((signal) => {
            const hasAiAnalysis = !!aiAnalyses[signal.id];
            const isAnalyzing = analyzingSignalId === signal.id;
            const isExpanded = expandedSignalId === signal.id;

            return (
              <div
                key={signal.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Accent line based on category */}
                <div 
                  className={`absolute top-0 inset-x-0 h-1 ${
                    signal.category === 'CONVERGENCE_OVER'
                      ? 'bg-emerald-500'
                      : signal.category === 'CONVERGENCE_UNDER'
                      ? 'bg-blue-500'
                      : signal.category === 'DIVERGENCE_WARNING'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                />

                {/* Top Row: Match Header & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {signal.flag_url && (
                      <img 
                        src={signal.flag_url} 
                        alt={signal.country} 
                        className="h-3.5 w-5 rounded object-cover border border-slate-200" 
                      />
                    )}
                    <span className="text-xs font-bold text-slate-700">{signal.league}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-mono text-slate-500">{signal.date_formatted}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-mono text-slate-500 font-semibold">
                      Volume cumulé : {formatMoney(signal.total_volume_combined)}
                    </span>
                  </div>

                  {/* Convergence score meter */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${signal.badge_color}`}>
                      {signal.category_label}
                    </span>
                    <span className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-lg ${
                      signal.convergence_score >= 80 
                        ? 'bg-emerald-100 text-emerald-900' 
                        : signal.convergence_score <= 40 
                        ? 'bg-rose-100 text-rose-900' 
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {signal.convergence_score}% Convergence
                    </span>
                  </div>
                </div>

                {/* Match Title */}
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {signal.home} <span className="text-slate-400 font-normal text-sm">vs</span> {signal.away}
                  </h3>
                  <div className="flex items-center gap-2">
                    {liveScores[signal.id]?.match && (
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                        <Trophy className="h-3 w-3 text-emerald-600" />
                        <span>Score ESPN : {liveScores[signal.id].match.home_score} - {liveScores[signal.id].match.away_score}</span>
                        <span className="text-[10px] text-emerald-700 font-semibold font-sans">({liveScores[signal.id].match.status_detail})</span>
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                      {signal.scenario_title}
                    </span>
                  </div>
                </div>

                {/* Constituent Markets Pill Summary */}
                <div className="mb-3.5 bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Marchés analysés ({signal.markets_included.length}) :
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {signal.markets_included.map((m, mIdx) => (
                      <div 
                        key={mIdx}
                        className="bg-white rounded-lg px-2.5 py-1 text-xs border border-slate-200 shadow-2xs flex items-center gap-1.5"
                      >
                        <span className="font-bold text-slate-800">{m.market_label} :</span>
                        <span className="text-emerald-700 font-semibold">{m.dominant_outcome}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-500">({m.dominant_pct}%)</span>
                        <span className="text-[10px] font-mono text-slate-400">@{m.coef.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Automated Synthesis Explanation */}
                <div className={`p-3.5 rounded-xl border mb-3.5 text-xs leading-relaxed ${
                  signal.category === 'DIVERGENCE_WARNING'
                    ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                    : 'bg-slate-900 text-slate-200 border-slate-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {signal.category === 'DIVERGENCE_WARNING' ? (
                      <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold block mb-0.5">
                        {signal.category === 'DIVERGENCE_WARNING' ? 'Analyse de la Contradiction :' : 'Interprétation Algorithmique des Flux :'}
                      </span>
                      <p className={signal.category === 'DIVERGENCE_WARNING' ? 'text-rose-800' : 'text-slate-300'}>
                        {signal.analysis_summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* DUAL ACTION RECOMMENDATION (Exactement comme demandé : Option Value vs Option Sécurité !) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
                  
                  {/* Option 1: Value Play */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
                    <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      €
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Option Rendement (Value)
                      </span>
                      <span className="text-xs font-extrabold text-emerald-950 block mt-0.5">
                        {signal.value_play}
                      </span>
                    </div>
                  </div>

                  {/* Option 2: Safety Play (Pour être plus à l'abri, ex: +1.5 buts !) */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
                    <div className="h-6 w-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 text-xs font-bold">
                      🛡️
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                        Option Sécurité (Pour être à l'abri)
                      </span>
                      <span className="text-xs font-extrabold text-amber-950 block mt-0.5">
                        {signal.safety_play}
                      </span>
                    </div>
                  </div>

                </div>

                {/* AI Deep Analysis Drawer if expanded */}
                {isExpanded && aiAnalyses[signal.id] && (
                  <div className="bg-slate-950 text-white rounded-xl p-4 border border-slate-800 mb-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-slate-800 pb-2">
                      <Brain className="h-4 w-4" />
                      <span>Rapport Stratégique IA Gemini (Analyse Multi-Marchés)</span>
                    </div>
                    
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Synthèse du marché :</span>
                      <p className="text-slate-300 mt-0.5">{aiAnalyses[signal.id].marketSynthesis}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-emerald-400 font-bold block">Pari recommandé (Value) :</span>
                        <span className="text-white font-bold">{aiAnalyses[signal.id].recommendedPlay}</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-amber-400 font-bold block">Filet de Sécurité :</span>
                        <span className="text-white font-bold">{aiAnalyses[signal.id].safetyNet}</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 font-bold block">Sharp Money vs Public :</span>
                      <p className="text-slate-300">{aiAnalyses[signal.id].sharpVsPublic}</p>
                    </div>

                    <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-amber-200 font-semibold">
                      Verdict : {aiAnalyses[signal.id].strategicConclusion}
                    </div>
                  </div>
                )}

                {/* Footer Controls: AI Button + Results Check + Details */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAnalyzeWithAi(signal)}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1.5 font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-colors cursor-pointer"
                    >
                      <Sparkles className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      <span>
                        {isAnalyzing
                          ? 'Analyse IA en cours...'
                          : isExpanded && hasAiAnalysis
                          ? 'Masquer l\'expertise IA'
                          : 'Expertise IA'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleCheckScore(signal)}
                      disabled={liveScores[signal.id]?.loading}
                      className="flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <Trophy className={`h-3.5 w-3.5 ${liveScores[signal.id]?.loading ? 'animate-spin' : ''}`} />
                      <span>{liveScores[signal.id]?.loading ? 'Recherche score...' : 'Vérifier le score direct'}</span>
                    </button>
                  </div>

                  {/* Open match in primary feed if match object available */}
                  {onSelectMatch && (signal.raw_matches['1x2'] || Object.values(signal.raw_matches)[0]) && (
                    <button
                      onClick={() => onSelectMatch(signal.raw_matches['1x2'] || Object.values(signal.raw_matches)[0])}
                      className="text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Voir le carnet d'ordres</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
