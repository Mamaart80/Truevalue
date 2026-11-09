import type { MarketKey } from './data/markets.ts';

export type { MarketKey };

export interface ScoreOutcome {
  label: string;
  coef: number | null;
  coef_new: number | null;
  volume: number;
  pct?: number;
}

export interface ScrapedMatch {
  id: string;
  date: string;
  date_formatted: string;
  sport: number;
  country: string;
  league: string;
  odds_type: string;
  home: string;
  away: string;
  market_id: number;
  selection_id: number;
  last_update: string;
  
  // Market classification
  market_key: MarketKey;
  market_type: '3_way' | '2_way' | 'multi';
  label_1: string;
  label_x?: string;
  label_2: string;

  // Initial Odds
  coef_1: number;
  coef_x: number;
  coef_2: number;
  
  // Current / New Odds
  coef_1_new: number;
  coef_x_new: number;
  coef_2_new: number;
  
  // Traded Volume (£)
  volume_1: number;
  volume_x: number;
  volume_2: number;
  total_volume: number;
  
  // Percentages of Volume
  pct_1: number;
  pct_x: number;
  pct_2: number;
  
  // Odds Evolution (% drop/rise)
  drop_1_pct: number;
  drop_x_pct: number;
  drop_2_pct: number;
  
  // Implied Probabilities (%)
  implied_prob_1: number;
  implied_prob_x: number;
  implied_prob_2: number;
  
  // Divergences (Volume % - Implied Prob %)
  divergence_1: number;
  divergence_x: number;
  divergence_2: number;
  
  // Smart Money Analytics
  dominant_outcome: string; // '1' | 'X' | '2' or specific label like 'Moins 2.5' or 'Oui'
  dominant_pct: number;
  smart_money_score: number; // 0 - 100
  signal_type: 'WHALE_ACCUMULATION' | 'SHARP_DROP' | 'UNDERDOG_SURGE' | 'FAVORITE_STEAM' | 'BALANCED';
  signal_label: string;
  signal_color: string;
  liquidity_tier: 'WHALE' | 'HIGH' | 'MEDIUM' | 'LOW';
  
  // Multi-outcome for Correct Score
  outcomes?: ScoreOutcome[];

  // Cross-Market awareness: How many other markets exist for this fixture
  linked_markets_count?: number;
  available_markets?: MarketKey[];

  // External URLs
  betfair_chart_url: string;
  betfair_market_url: string;
  flag_url: string;
}

export interface MarketSummaryItem {
  key: MarketKey;
  label: string;
  shortLabel: string;
  match_count: number;
  total_volume: number;
  dominant_trend: string;
}

export interface ApiResponse {
  success: boolean;
  market: MarketKey;
  url: string;
  data: ScrapedMatch[];
  meta: {
    source: string;
    scraped_at: string;
    data_updated_at?: string;
    data_age_seconds?: number;
    total_matches: number;
    total_volume_slate: number;
    is_fallback?: boolean;
    is_stale?: boolean;
  };
  error?: string;
}

export interface AiMatchAnalysis {
  headline: string;
  marketDynamic: string;
  sharpVsPublic: string;
  impliedVsReal: string;
  verdict: string;
  riskLevel: string;
  keyAdvice: string;
}

export interface CrossMarketFixture {
  home: string;
  away: string;
  league: string;
  country: string;
  date_formatted: string;
  markets: {
    market_key: MarketKey;
    market_label: string;
    total_volume: number;
    dominant_label: string;
    dominant_pct: number;
    coef_dominant: number;
    signal_label: string;
    match_id: string;
    raw: ScrapedMatch;
  }[];
}

// Interprétation Automatisée des Signaux Croisés (Convergence & Divergence)
export type SignalCategory = 
  | 'CONVERGENCE_OVER'      // Convergence Offensive (+2.5 buts, scores 2-1/1-2, BTTS Oui)
  | 'CONVERGENCE_UNDER'     // Convergence Défensive (-2.5 buts, scores 1-0/0-0, BTTS Non)
  | 'CONVERGENCE_FAVORITE'  // Consensus Écrasant Favori (1X2 + DNB + DC)
  | 'DIVERGENCE_WARNING'    // Alerte Contradiction de Marché / Piège
  | 'NEUTRAL_OPPORTUNITY';  // Signal Modéré

export interface CrossMarketSignal {
  id: string;
  fixture_key: string;
  home: string;
  away: string;
  league: string;
  country: string;
  flag_url?: string;
  date_formatted: string;
  convergence_score: number; // 0 - 100%
  category: SignalCategory;
  category_label: string;
  badge_color: string;
  scenario_title: string;
  analysis_summary: string;
  value_play: string;
  safety_play: string;
  divergence_explanation?: string;
  total_volume_combined: number;
  markets_included: {
    market_key: MarketKey;
    market_label: string;
    dominant_outcome: string;
    dominant_pct: number;
    coef: number;
    volume: number;
    signal_label: string;
  }[];
  raw_matches: Record<string, ScrapedMatch>;
}

// Live Score & Match Results API (Free ESPN Integration)
export type MatchStatusState = 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';

export interface EspnMatchResult {
  id: string;
  name: string;
  date: string;
  date_formatted: string;
  league_slug: string;
  league_name: string;
  home_team: string;
  home_team_short: string;
  home_logo?: string;
  away_team: string;
  away_team_short: string;
  away_logo?: string;
  home_score: number | null;
  away_score: number | null;
  status_state: MatchStatusState;
  status_detail: string; // e.g. "FT", "90'+4", "Mi-temps", "18:00"
  clock?: string;
  completed: boolean;
  winner?: 'HOME' | 'AWAY' | 'DRAW' | null;
  total_goals?: number | null;
  btts?: boolean | null;
}

export type BetOutcome = 'WON' | 'LOST' | 'PENDING' | 'PUSH' | 'UNKNOWN';

export interface SignalVerification {
  signal_id: string;
  home: string;
  away: string;
  matched: boolean;
  match_result?: EspnMatchResult;
  value_play: string;
  value_play_outcome: BetOutcome;
  value_play_explanation: string;
  safety_play: string;
  safety_play_outcome: BetOutcome;
  safety_play_explanation: string;
}

