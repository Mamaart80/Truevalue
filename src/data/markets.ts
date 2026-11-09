export type MarketKey = 
  | '1x2' 
  | 'over-under-2-5' 
  | 'btts' 
  | 'double-chance' 
  | 'dnb' 
  | 'over-under-1-5' 
  | 'over-under-3-5' 
  | 'half-time' 
  | 'correct-score'
  | 'ht-ft';

export interface MarketDef {
  key: MarketKey;
  label: string;
  shortLabel: string;
  category: 'core' | 'goals' | 'combo' | 'scores';
  type: '3_way' | '2_way' | 'multi';
  badgeColor: string;
  accentColor: string;
  arbworldMarket: string;
  labels: {
    opt1: string;
    optX?: string;
    opt2: string;
  };
  helpText: string;
}

export const FOOTBALL_MARKETS: MarketDef[] = [
  {
    key: '1x2',
    label: 'Résultat du Match (1X2)',
    shortLabel: '1X2 Résultat',
    category: 'core',
    type: '3_way',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentColor: 'emerald',
    arbworldMarket: 'MATCH_ODDS',
    labels: {
      opt1: '1 (Domicile)',
      optX: 'X (Nul)',
      opt2: '2 (Extérieur)',
    },
    helpText: 'Volume sur victoire équipe 1, match nul ou victoire équipe 2.',
  },
  {
    key: 'over-under-2-5',
    label: 'Plus / Moins 2.5 Buts',
    shortLabel: '+/- 2.5 Buts',
    category: 'goals',
    type: '2_way',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    accentColor: 'blue',
    arbworldMarket: 'OVER_UNDER_25',
    labels: {
      opt1: 'Moins 2.5 (Under)',
      opt2: 'Plus 2.5 (Over)',
    },
    helpText: 'Marché 2 issues : Moins de 2.5 buts (0, 1 ou 2 buts) vs Plus de 2.5 buts (3 buts ou +).',
  },
  {
    key: 'btts',
    label: 'Les 2 équipes marquent (BTTS)',
    shortLabel: '2 Équipes Marquent',
    category: 'goals',
    type: '2_way',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    accentColor: 'violet',
    arbworldMarket: 'BOTH_TEAMS_TO_SCORE',
    labels: {
      opt1: 'Oui (BTTS-Yes)',
      opt2: 'Non (BTTS-No)',
    },
    helpText: 'Marché 2 issues : Les deux équipes marqueront-elles au moins un but ?',
  },
  {
    key: 'double-chance',
    label: 'Double Chance (1X, X2, 12)',
    shortLabel: 'Double Chance',
    category: 'core',
    type: '3_way',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentColor: 'indigo',
    arbworldMarket: 'DOUBLE_CHANCE',
    labels: {
      opt1: '1X (Dom ou Nul)',
      optX: 'X2 (Nul ou Ext)',
      opt2: '12 (Dom ou Ext)',
    },
    helpText: 'Couverture de 2 issues sur 3 en un seul pari.',
  },
  {
    key: 'dnb',
    label: 'Remboursé si Nul (Draw No Bet)',
    shortLabel: 'DNB (Nul Remboursé)',
    category: 'core',
    type: '2_way',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    accentColor: 'teal',
    arbworldMarket: 'DRAW_NO_BET',
    labels: {
      opt1: '1 (DNB Dom)',
      opt2: '2 (DNB Ext)',
    },
    helpText: 'En cas de match nul, la mise est remboursée.',
  },
  {
    key: 'over-under-1-5',
    label: 'Plus / Moins 1.5 Buts',
    shortLabel: '+/- 1.5 Buts',
    category: 'goals',
    type: '2_way',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    accentColor: 'sky',
    arbworldMarket: 'OVER_UNDER_15',
    labels: {
      opt1: 'Moins 1.5 (Under)',
      opt2: 'Plus 1.5 (Over)',
    },
    helpText: 'Moins de 1.5 buts (0 ou 1 but) vs Plus de 1.5 buts (2 buts ou +).',
  },
  {
    key: 'over-under-3-5',
    label: 'Plus / Moins 3.5 Buts',
    shortLabel: '+/- 3.5 Buts',
    category: 'goals',
    type: '2_way',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    accentColor: 'cyan',
    arbworldMarket: 'OVER_UNDER_35',
    labels: {
      opt1: 'Moins 3.5 (Under)',
      opt2: 'Plus 3.5 (Over)',
    },
    helpText: 'Moins de 3.5 buts (0 à 3 buts) vs Plus de 3.5 buts (4 buts ou +).',
  },
  {
    key: 'half-time',
    label: 'Mi-temps Résultat (1X2 MT)',
    shortLabel: 'Mi-Temps 1X2',
    category: 'combo',
    type: '3_way',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    accentColor: 'amber',
    arbworldMarket: 'HALF_TIME',
    labels: {
      opt1: '1 (MT Dom)',
      optX: 'X (MT Nul)',
      opt2: '2 (MT Ext)',
    },
    helpText: 'Résultat du match à la fin de la 1ère mi-temps (45 min).',
  },
  {
    key: 'correct-score',
    label: 'Score Exact',
    shortLabel: 'Score Exact',
    category: 'scores',
    type: 'multi',
    badgeColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    accentColor: 'fuchsia',
    arbworldMarket: 'CORRECT_SCORE',
    labels: {
      opt1: 'Top Score 1',
      optX: 'Top Score 2',
      opt2: 'Top Score 3',
    },
    helpText: 'Distribution des volumes sur les scores exacts (0-0, 1-1, 2-1, etc.).',
  },
  {
    key: 'ht-ft',
    label: 'Mi-temps / Fin de match (HT/FT)',
    shortLabel: 'MT / Fin de Match',
    category: 'combo',
    type: 'multi',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    accentColor: 'rose',
    arbworldMarket: 'HALF_TIME_FULL_TIME',
    labels: {
      opt1: '1/1',
      optX: 'X/1',
      opt2: 'X/X',
    },
    helpText: 'Combinaison du résultat à la mi-temps et au coup de sifflet final.',
  },
];

export function getMarketDef(key: MarketKey): MarketDef {
  const found = FOOTBALL_MARKETS.find(m => m.key === key);
  return found || FOOTBALL_MARKETS[0];
}
