import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  RefreshCw, 
  Search, 
  Radio, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  Percent,
  Check,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { EspnMatchResult, SignalVerification, BetOutcome } from '../types';
import { SUPPORTED_LEAGUES } from '../utils/resultsService';

interface ResultsVerificationViewProps {
  onSelectMatchName?: (home: string, away: string) => void;
}

export const ResultsVerificationView: React.FC<ResultsVerificationViewProps> = ({
  onSelectMatchName,
}) => {
  const [activeTab, setActiveTab] = useState<'VERIFY_SIGNALS' | 'LIVE_SCORES'>('VERIFY_SIGNALS');
  
  // State for Verify Signals
  const [isLoadingVerifications, setIsLoadingVerifications] = useState(false);
  const [verificationData, setVerificationData] = useState<{
    stats: {
      total_signals: number;
      matched_in_scoreboard: number;
      finished_matches: number;
      value_play: { won: number; lost: number; win_rate_pct: number };
      safety_play: { won: number; lost: number; win_rate_pct: number };
    };
    verifications: SignalVerification[];
    timestamp: string;
  } | null>(null);
  const [verifFilter, setVerifFilter] = useState<'ALL' | 'WON' | 'LOST' | 'LIVE' | 'SCHEDULED'>('ALL');
  const [verifSearch, setVerifSearch] = useState('');

  // State for Live Scores
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [scoreboardMatches, setScoreboardMatches] = useState<EspnMatchResult[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [selectedDateMode, setSelectedDateMode] = useState<'today' | 'yesterday' | 'tomorrow'>('today');
  const [scoreStatusFilter, setScoreStatusFilter] = useState<'all' | 'live' | 'finished' | 'scheduled'>('all');
  const [scoreSearch, setScoreSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Compute date string YYYYMMDD
  const dateParam = useMemo(() => {
    const d = new Date();
    if (selectedDateMode === 'yesterday') d.setDate(d.getDate() - 1);
    if (selectedDateMode === 'tomorrow') d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  }, [selectedDateMode]);

  // Fetch Signal Verifications
  const loadVerifications = async () => {
    setIsLoadingVerifications(true);
    try {
      const res = await fetch('/api/results/verify-signals');
      const data = await res.json();
      if (data.success) {
        setVerificationData(data);
      }
    } catch (err) {
      console.error('Failed to load signal verifications:', err);
    } finally {
      setIsLoadingVerifications(false);
    }
  };

  // Fetch Scoreboard
  const loadScoreboard = async () => {
    setIsLoadingScores(true);
    try {
      const url = `/api/results/scoreboard?league=${encodeURIComponent(selectedLeague)}&date=${dateParam}&status=${scoreStatusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.matches)) {
        setScoreboardMatches(data.matches);
        setLastUpdated(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.error('Failed to load scoreboard:', err);
    } finally {
      setIsLoadingScores(false);
    }
  };

  useEffect(() => {
    loadVerifications();
  }, []);

  useEffect(() => {
    if (activeTab === 'LIVE_SCORES') {
      loadScoreboard();
    }
  }, [activeTab, selectedLeague, dateParam, scoreStatusFilter]);

  // Filtered verifications
  const filteredVerifications = useMemo(() => {
    if (!verificationData?.verifications) return [];
    return verificationData.verifications.filter(v => {
      if (verifSearch.trim()) {
        const q = verifSearch.toLowerCase();
        if (!`${v.home} ${v.away}`.toLowerCase().includes(q)) return false;
      }
      if (verifFilter === 'WON') {
        return v.value_play_outcome === 'WON' || v.safety_play_outcome === 'WON';
      }
      if (verifFilter === 'LOST') {
        return v.value_play_outcome === 'LOST' || v.safety_play_outcome === 'LOST';
      }
      if (verifFilter === 'LIVE') {
        return v.match_result?.status_state === 'IN_PROGRESS';
      }
      if (verifFilter === 'SCHEDULED') {
        return v.match_result?.status_state === 'SCHEDULED';
      }
      return true;
    });
  }, [verificationData, verifFilter, verifSearch]);

  // Filtered scoreboard matches
  const filteredScoreboard = useMemo(() => {
    return scoreboardMatches.filter(m => {
      if (scoreSearch.trim()) {
        const q = scoreSearch.toLowerCase();
        if (!`${m.home_team} ${m.away_team} ${m.league_name}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [scoreboardMatches, scoreSearch]);

  const liveMatchesCount = useMemo(() => {
    return scoreboardMatches.filter(m => m.status_state === 'IN_PROGRESS').length;
  }, [scoreboardMatches]);

  const renderOutcomeBadge = (outcome: BetOutcome) => {
    switch (outcome) {
      case 'WON':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            VALIDÉ (GAGNÉ)
          </span>
        );
      case 'LOST':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="h-3 w-3" />
            NON VALIDÉ
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="h-3 w-3" />
            EN COURS / PRÉVU
          </span>
        );
      case 'PUSH':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
            REMBOURSÉ (DNB)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            EN ATTENTE
          </span>
        );
    }
  };

  return (
    <div className="flex-1 bg-[#FBFBFD] p-3.5 sm:p-6 lg:p-7 rounded-3xl lg:rounded-l-none overflow-y-auto">
      
      {/* 1. Header with Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 font-bold">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Vérification des Résultats & Scores en Direct
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-300">
                  API Gratuite Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Vérification automatique des signaux MoneyWay et résultats mondiaux en temps réel (via ESPN Scores)
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('VERIFY_SIGNALS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'VERIFY_SIGNALS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Vérifier les Prédictions</span>
          </button>

          <button
            onClick={() => setActiveTab('LIVE_SCORES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LIVE_SCORES'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            <span>Multiplex & Scores en Direct</span>
            {liveMatchesCount > 0 && (
              <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                {liveMatchesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. TAB 1: VERIFIER LES PREDICTIONS MONEYWAY */}
      {activeTab === 'VERIFY_SIGNALS' && (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                <span>Signaux Recoupés</span>
                <Check className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">
                {verificationData?.stats.total_signals ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {verificationData?.stats.matched_in_scoreboard ?? 0} appairés dans le calendrier
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-xs text-emerald-700 font-bold mb-1">
                <span>Taux de Succès Option Value</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono flex items-baseline gap-1">
                <span>{verificationData?.stats.value_play.win_rate_pct ?? 0}%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {verificationData?.stats.value_play.won ?? 0} validés / {verificationData?.stats.value_play.lost ?? 0} manqués
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-xs text-amber-700 font-bold mb-1">
                <span>Taux de Succès Sécurité</span>
                <ShieldCheck className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">
                {verificationData?.stats.safety_play.win_rate_pct ?? 0}%
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {verificationData?.stats.safety_play.won ?? 0} validés (ex: +1.5 buts, DC)
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-xs text-blue-700 font-bold mb-1">
                <span>Matchs Déjà Terminés</span>
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">
                {verificationData?.stats.finished_matches ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Scores définitifs certifiés
              </p>
            </div>

          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-3 mb-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setVerifFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  verifFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tous les Signaux ({verificationData?.verifications.length ?? 0})
              </button>
              <button
                onClick={() => setVerifFilter('WON')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  verifFilter === 'WON' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ✅ Validés (Gagnés)
              </button>
              <button
                onClick={() => setVerifFilter('LOST')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  verifFilter === 'LOST' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ❌ Non Validés
              </button>
              <button
                onClick={() => setVerifFilter('LIVE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  verifFilter === 'LIVE' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ⏱️ En Cours
              </button>
              <button
                onClick={() => setVerifFilter('SCHEDULED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  verifFilter === 'SCHEDULED' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                📅 Programmés
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filtrer une équipe..."
                  value={verifSearch}
                  onChange={(e) => setVerifSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-emerald-400 w-full sm:w-44"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>

              <button
                onClick={loadVerifications}
                disabled={isLoadingVerifications}
                className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Actualiser la vérification"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingVerifications ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* List of Verified Signals */}
          {isLoadingVerifications ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200/80">
              <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Interrogation de l'API Résultats en temps réel...</p>
              <p className="text-xs text-slate-400 mt-1">Recoupement des scores en direct et vérification des paris</p>
            </div>
          ) : filteredVerifications.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center text-slate-500 border border-slate-200/80">
              <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Aucun match ne correspond aux filtres</h3>
              <p className="text-xs text-slate-500 mt-1">Sélectionnez "Tous les signaux" ou modifiez votre recherche.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredVerifications.map((item, idx) => {
                const res = item.match_result;
                const isFinished = res?.completed || res?.status_state === 'FINISHED';
                const isLive = res?.status_state === 'IN_PROGRESS';

                return (
                  <div 
                    key={idx}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all"
                  >
                    {/* Header Row: League, Date & ESPN Live Match Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-800">
                          {res?.league_name || 'Football'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-mono text-slate-500">
                          {res?.date_formatted || 'Heure du match'}
                        </span>
                      </div>

                      {/* Scoreboard Status Badge */}
                      <div className="flex items-center gap-2">
                        {isLive && (
                          <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                            <span className="h-2 w-2 rounded-full bg-rose-600"></span>
                            <span>EN DIRECT • {res?.clock || res?.status_detail}</span>
                          </span>
                        )}
                        {isFinished && (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                            TERMINÉ ({res?.status_detail})
                          </span>
                        )}
                        {!isLive && !isFinished && res && (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {res.status_detail}
                          </span>
                        )}
                        {!res && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            Calendrier en attente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Match & Live Score Board */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                          <span>{item.home}</span>
                          <span className="text-xs font-normal text-slate-400">vs</span>
                          <span>{item.away}</span>
                        </h3>
                        {res && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Match certifié API ESPN : {res.name}
                          </p>
                        )}
                      </div>

                      {/* Large Score Display if match found */}
                      {res && res.home_score !== null && res.away_score !== null ? (
                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-600">Score Réel :</span>
                          <div className="text-2xl font-black font-mono text-slate-900 tracking-wider">
                            {res.home_score} - {res.away_score}
                          </div>
                          {res.total_goals !== null && (
                            <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              {res.total_goals} but(s)
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                          Coup d'envoi à venir
                        </div>
                      )}
                    </div>

                    {/* Predictions Verification Grid: Option Value vs Option Sécurité */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      
                      {/* 1. Value Play */}
                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                            Option Rendement (Value)
                          </span>
                          {renderOutcomeBadge(item.value_play_outcome)}
                        </div>
                        <div className="text-xs font-extrabold text-slate-900 mb-1">
                          {item.value_play}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {item.value_play_explanation}
                        </p>
                      </div>

                      {/* 2. Safety Play */}
                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                            Option Sécurité
                          </span>
                          {renderOutcomeBadge(item.safety_play_outcome)}
                        </div>
                        <div className="text-xs font-extrabold text-slate-900 mb-1">
                          {item.safety_play}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {item.safety_play_explanation}
                        </p>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 3. TAB 2: MULTIPLEX & LIVE SCORES GLOBAL */}
      {activeTab === 'LIVE_SCORES' && (
        <>
          {/* Controls Bar: Date + League Pills + Search */}
          <div className="bg-white rounded-2xl p-4 mb-5 border border-slate-200/80 shadow-xs space-y-3">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              {/* Date Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedDateMode('yesterday')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedDateMode === 'yesterday' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hier (Résultats)
                </button>
                <button
                  onClick={() => setSelectedDateMode('today')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedDateMode === 'today' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={() => setSelectedDateMode('tomorrow')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedDateMode === 'tomorrow' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Demain
                </button>
              </div>

              {/* Status Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setScoreStatusFilter('all')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                    scoreStatusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setScoreStatusFilter('live')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    scoreStatusFilter === 'live' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  <span>En Direct ({liveMatchesCount})</span>
                </button>
                <button
                  onClick={() => setScoreStatusFilter('finished')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                    scoreStatusFilter === 'finished' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Terminés
                </button>
                <button
                  onClick={() => setScoreStatusFilter('scheduled')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                    scoreStatusFilter === 'scheduled' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Programmés
                </button>
              </div>

              {/* Search & Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Chercher équipe ou ligue..."
                    value={scoreSearch}
                    onChange={(e) => setScoreSearch(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-emerald-400 w-full sm:w-48"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>

                <button
                  onClick={loadScoreboard}
                  disabled={isLoadingScores}
                  className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Rafraîchir les scores"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingScores ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
              </div>

            </div>

            {/* League Horizontal Filter Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none border-t border-slate-100">
              <button
                onClick={() => setSelectedLeague('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedLeague === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🌍 Toutes les Ligues
              </button>

              {SUPPORTED_LEAGUES.map((lg) => (
                <button
                  key={lg.slug}
                  onClick={() => setSelectedLeague(lg.slug)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedLeague === lg.slug
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{lg.flag}</span>
                  <span>{lg.name}</span>
                </button>
              ))}
            </div>

          </div>

          {/* Matches Grid */}
          {isLoadingScores ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200/80">
              <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Récupération des scores ESPN en cours...</p>
            </div>
          ) : filteredScoreboard.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center text-slate-500 border border-slate-200/80">
              <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Aucun match trouvé pour ces critères</h3>
              <p className="text-xs text-slate-500 mt-1">Changez de date, de ligue ou effacez la recherche.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredScoreboard.map((m) => {
                const isLive = m.status_state === 'IN_PROGRESS';
                const isFinished = m.completed || m.status_state === 'FINISHED';

                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    {/* League & Time */}
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2.5">
                      <span className="font-bold text-slate-700 truncate max-w-[200px]">
                        {m.league_name}
                      </span>

                      <div>
                        {isLive ? (
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                            {m.clock || m.status_detail}
                          </span>
                        ) : isFinished ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {m.status_detail}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-500">
                            {m.date_formatted}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Teams & Score */}
                    <div className="space-y-2 mb-3">
                      
                      {/* Home */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {m.home_logo ? (
                            <img src={m.home_logo} alt={m.home_team} className="h-5 w-5 object-contain" />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600">
                              {m.home_team_short.slice(0, 2)}
                            </div>
                          )}
                          <span className={`text-sm font-bold ${m.winner === 'HOME' ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {m.home_team}
                          </span>
                        </div>
                        <span className="text-base font-mono font-black text-slate-900">
                          {m.home_score !== null ? m.home_score : '-'}
                        </span>
                      </div>

                      {/* Away */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {m.away_logo ? (
                            <img src={m.away_logo} alt={m.away_team} className="h-5 w-5 object-contain" />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600">
                              {m.away_team_short.slice(0, 2)}
                            </div>
                          )}
                          <span className={`text-sm font-bold ${m.winner === 'AWAY' ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {m.away_team}
                          </span>
                        </div>
                        <span className="text-base font-mono font-black text-slate-900">
                          {m.away_score !== null ? m.away_score : '-'}
                        </span>
                      </div>

                    </div>

                    {/* Market Outcomes Badge Summary */}
                    {m.home_score !== null && m.away_score !== null && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            Total : <strong className="text-slate-800">{m.total_goals}</strong> buts
                          </span>
                          <span>•</span>
                          <span className={m.total_goals !== null && m.total_goals !== undefined && m.total_goals >= 3 ? 'text-emerald-700 font-bold' : 'text-blue-700 font-bold'}>
                            {m.total_goals !== null && m.total_goals !== undefined && m.total_goals >= 3 ? 'Over 2.5' : 'Under 2.5'}
                          </span>
                          <span>•</span>
                          <span className={m.btts ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                            {m.btts ? 'BTTS Oui' : 'BTTS Non'}
                          </span>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

    </div>
  );
};
