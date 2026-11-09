import type { EspnMatchResult, MatchStatusState, BetOutcome, SignalVerification, CrossMarketSignal } from '../types.ts';

export interface ScoreboardLeagueInfo {
  slug: string;
  name: string;
  category: 'EUROPE' | 'ENGLAND' | 'SPAIN' | 'ITALY' | 'GERMANY' | 'FRANCE' | 'OTHER';
  flag: string;
}

export const SUPPORTED_LEAGUES: ScoreboardLeagueInfo[] = [
  { slug: 'uefa.nations', name: 'UEFA Nations League', category: 'EUROPE', flag: '🇪🇺' },
  { slug: 'uefa.champions', name: 'Ligue des Champions', category: 'EUROPE', flag: '🇪🇺' },
  { slug: 'uefa.europa', name: 'Ligue Europa', category: 'EUROPE', flag: '🇪🇺' },
  { slug: 'uefa.europa.conf', name: 'Ligue Conférence', category: 'EUROPE', flag: '🇪🇺' },
  { slug: 'eng.1', name: 'Premier League', category: 'ENGLAND', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { slug: 'eng.2', name: 'Championship', category: 'ENGLAND', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { slug: 'eng.3', name: 'League One', category: 'ENGLAND', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { slug: 'eng.4', name: 'League Two', category: 'ENGLAND', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { slug: 'eng.fa', name: 'FA Cup', category: 'ENGLAND', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { slug: 'eng.trophy', name: 'EFL Trophy', category: 'ENGLAND', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { slug: 'esp.1', name: 'La Liga (Espagne)', category: 'SPAIN', flag: '🇪🇸' },
  { slug: 'esp.2', name: 'Segunda Division (Espagne)', category: 'SPAIN', flag: '🇪🇸' },
  { slug: 'esp.copa_del_rey', name: 'Coupe du Roi', category: 'SPAIN', flag: '🇪🇸' },
  { slug: 'ita.1', name: 'Serie A (Italie)', category: 'ITALY', flag: '🇮🇹' },
  { slug: 'ita.2', name: 'Serie B (Italie)', category: 'ITALY', flag: '🇮🇹' },
  { slug: 'ger.1', name: 'Bundesliga (Allemagne)', category: 'GERMANY', flag: '🇩🇪' },
  { slug: 'ger.2', name: '2. Bundesliga', category: 'GERMANY', flag: '🇩🇪' },
  { slug: 'fra.1', name: 'Ligue 1 (France)', category: 'FRANCE', flag: '🇫🇷' },
  { slug: 'fra.2', name: 'Ligue 2 (France)', category: 'FRANCE', flag: '🇫🇷' },
  { slug: 'ned.1', name: 'Eredivisie (Pays-Bas)', category: 'OTHER', flag: '🇳🇱' },
  { slug: 'por.1', name: 'Liga Portugal', category: 'OTHER', flag: '🇵🇹' },
  { slug: 'tur.1', name: 'Super Lig (Turquie)', category: 'OTHER', flag: '🇹🇷' },
  { slug: 'bel.1', name: 'Pro League (Belgique)', category: 'OTHER', flag: '🇧🇪' },
  { slug: 'sco.1', name: 'Premiership (Écosse)', category: 'OTHER', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { slug: 'conmebol.libertadores', name: 'Copa Libertadores', category: 'OTHER', flag: '🌎' },
  { slug: 'fifa.friendly', name: 'Matchs Amicaux Internationaux', category: 'OTHER', flag: '🌍' },
];

// Helper to normalize team names for cross-platform matching
export function cleanTeamName(name: string): string {
  if (!name) return '';
  let n = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
  // Replace common variations
  n = n.replace(/\butd\b/g, 'united')
       .replace(/\bco\b/g, 'county')
       .replace(/\bath\b/g, 'athletic')
       .replace(/\bint\b/g, 'inter')
       .replace(/\breal\b/g, '')
       .replace(/\bfc\b/g, '')
       .replace(/\bcf\b/g, '')
       .replace(/\basd\b/g, '')
       .replace(/\bsc\b/g, '')
       .replace(/\bcd\b/g, '')
       .replace(/\bce\b/g, '')
       .replace(/\bafc\b/g, '')
       .replace(/\bclub\b/g, '');

  return n.replace(/[^a-z0-9]/g, '');
}

export function computeSimilarity(a: string, b: string): number {
  const normA = cleanTeamName(a);
  const normB = cleanTeamName(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;

  // Bigram Dice coefficient
  const getBigrams = (str: string) => {
    const s = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      s.add(str.substring(i, i + 2));
    }
    return s;
  };

  const bgA = getBigrams(normA);
  const bgB = getBigrams(normB);
  if (bgA.size === 0 || bgB.size === 0) return 0;

  let intersection = 0;
  bgA.forEach(item => {
    if (bgB.has(item)) intersection++;
  });

  return (2.0 * intersection) / (bgA.size + bgB.size);
}

// Convert ESPN Event to our clean EspnMatchResult structure
export function parseEspnEvent(event: any, leagueSlug: string, leagueName: string): EspnMatchResult | null {
  try {
    const comp = event.competitions?.[0];
    if (!comp || !Array.isArray(comp.competitors) || comp.competitors.length < 2) {
      return null;
    }

    const homeComp = comp.competitors.find((c: any) => c.homeAway === 'home') || comp.competitors[0];
    const awayComp = comp.competitors.find((c: any) => c.homeAway === 'away') || comp.competitors[1];

    const statusObj = event.status || {};
    const statusType = statusObj.type || {};
    const state = statusType.state; // 'pre', 'in', 'post'
    const completed = statusType.completed === true || state === 'post';

    let statusState: MatchStatusState = 'SCHEDULED';
    if (state === 'in') {
      statusState = 'IN_PROGRESS';
    } else if (completed) {
      statusState = 'FINISHED';
    } else if (statusType.name?.includes('POSTPONED')) {
      statusState = 'POSTPONED';
    } else if (statusType.name?.includes('CANCELLED')) {
      statusState = 'CANCELLED';
    }

    const homeScoreRaw = homeComp.score !== undefined ? parseInt(homeComp.score, 10) : null;
    const awayScoreRaw = awayComp.score !== undefined ? parseInt(awayComp.score, 10) : null;

    const homeScore = !isNaN(homeScoreRaw as number) ? homeScoreRaw : null;
    const awayScore = !isNaN(awayScoreRaw as number) ? awayScoreRaw : null;

    let winner: 'HOME' | 'AWAY' | 'DRAW' | null = null;
    let totalGoals: number | null = null;
    let btts: boolean | null = null;

    if (homeScore !== null && awayScore !== null) {
      totalGoals = homeScore + awayScore;
      btts = homeScore > 0 && awayScore > 0;
      if (completed || statusState === 'IN_PROGRESS') {
        if (homeScore > awayScore) winner = 'HOME';
        else if (awayScore > homeScore) winner = 'AWAY';
        else winner = 'DRAW';
      }
    }

    const dateIso = event.date || comp.date || '';
    const dateFormatted = dateIso ? new Date(dateIso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }) : '';

    return {
      id: event.id || String(Math.random()),
      name: event.name || `${homeComp.team?.displayName} vs ${awayComp.team?.displayName}`,
      date: dateIso,
      date_formatted: dateFormatted,
      league_slug: leagueSlug,
      league_name: leagueName,
      home_team: homeComp.team?.displayName || 'Domicile',
      home_team_short: homeComp.team?.shortDisplayName || homeComp.team?.abbreviation || 'DOM',
      home_logo: homeComp.team?.logo,
      away_team: awayComp.team?.displayName || 'Extérieur',
      away_team_short: awayComp.team?.shortDisplayName || awayComp.team?.abbreviation || 'EXT',
      away_logo: awayComp.team?.logo,
      home_score: homeScore,
      away_score: awayScore,
      status_state: statusState,
      status_detail: statusType.shortDetail || statusType.detail || (completed ? 'FT' : 'Prévu'),
      clock: statusObj.displayClock,
      completed,
      winner,
      total_goals: totalGoals,
      btts,
    };
  } catch (err) {
    console.error('Error parsing ESPN event:', err);
    return null;
  }
}

// Find match result from a pool of ESPN matches
export function findMatchingEspnEvent(home: string, away: string, events: EspnMatchResult[]): EspnMatchResult | null {
  let bestMatch: EspnMatchResult | null = null;
  let bestScore = 0;

  for (const ev of events) {
    const hScore = Math.max(
      computeSimilarity(home, ev.home_team),
      computeSimilarity(home, ev.home_team_short)
    );
    const aScore = Math.max(
      computeSimilarity(away, ev.away_team),
      computeSimilarity(away, ev.away_team_short)
    );

    // Both teams must match reasonably well
    if (hScore >= 0.55 && aScore >= 0.55) {
      const avg = (hScore + aScore) / 2;
      if (avg > bestScore) {
        bestScore = avg;
        bestMatch = ev;
      }
    }
  }

  return bestScore >= 0.60 ? bestMatch : null;
}

// Automatic verification of a betting selection against actual match result
export function verifySelectionAgainstResult(selection: string, result?: EspnMatchResult): { outcome: BetOutcome; explanation: string } {
  if (!result) {
    return {
      outcome: 'UNKNOWN',
      explanation: 'Match non encore répertorié ou heure trop lointaine dans le calendrier ESPN.',
    };
  }

  if (result.status_state === 'SCHEDULED') {
    return {
      outcome: 'PENDING',
      explanation: `Coup d'envoi prévu à ${result.date_formatted} (${result.status_detail}).`,
    };
  }

  const s = selection.toLowerCase();
  const goals = result.total_goals ?? 0;
  const isFinished = result.completed || result.status_state === 'FINISHED';
  const isLive = result.status_state === 'IN_PROGRESS';
  const scoreStr = `${result.home_score} - ${result.away_score}`;

  // 1. Over 2.5 Buts
  if (s.includes('plus de 2.5') || s.includes('over 2.5') || s.includes('+2.5')) {
    if (goals >= 3) {
      return {
        outcome: 'WON',
        explanation: `${isFinished ? 'Validé ✅' : 'Validé en direct ⏱️'} : ${goals} buts marqués (${scoreStr}).`,
      };
    }
    if (isFinished) {
      return {
        outcome: 'LOST',
        explanation: `Perdu ❌ : seulement ${goals} but(s) au terme du match (${scoreStr}).`,
      };
    }
    return {
      outcome: 'PENDING',
      explanation: `En cours (${result.status_detail}) : actuellement ${goals} but(s) (${scoreStr}), seuil de 3 buts visé.`,
    };
  }

  // 2. Over 1.5 Buts
  if (s.includes('plus de 1.5') || s.includes('over 1.5') || s.includes('+1.5')) {
    if (goals >= 2) {
      return {
        outcome: 'WON',
        explanation: `${isFinished ? 'Validé ✅ (Sécurité payante)' : 'Validé en direct ⏱️'} : ${goals} buts marqués (${scoreStr}).`,
      };
    }
    if (isFinished) {
      return {
        outcome: 'LOST',
        explanation: `Perdu ❌ : seulement ${goals} but (${scoreStr}).`,
      };
    }
    return {
      outcome: 'PENDING',
      explanation: `En cours (${result.status_detail}) : ${scoreStr}, 2 buts nécessaires.`,
    };
  }

  // 3. Under 2.5 Buts
  if (s.includes('moins de 2.5') || s.includes('under 2.5') || s.includes('-2.5')) {
    if (goals > 2) {
      return {
        outcome: 'LOST',
        explanation: `Perdu ❌ : ${goals} buts marqués (${scoreStr}), supérieur au palier de 2.5.`,
      };
    }
    if (isFinished) {
      return {
        outcome: 'WON',
        explanation: `Validé ✅ : Match cadenassé avec ${goals} but(s) (${scoreStr}).`,
      };
    }
    return {
      outcome: 'PENDING',
      explanation: `En cours (${result.status_detail}) : ${goals} but(s) (${scoreStr}), scénario verrouillé sous contrôle.`,
    };
  }

  // 4. Under 3.5 Buts
  if (s.includes('moins de 3.5') || s.includes('under 3.5') || s.includes('-3.5')) {
    if (goals > 3) {
      return {
        outcome: 'LOST',
        explanation: `Perdu ❌ : ${goals} buts marqués (${scoreStr}).`,
      };
    }
    if (isFinished) {
      return {
        outcome: 'WON',
        explanation: `Validé ✅ : ${goals} buts au coup de sifflet final (${scoreStr}).`,
      };
    }
    return {
      outcome: 'PENDING',
      explanation: `En cours (${result.status_detail}) : ${goals} but(s) (${scoreStr}).`,
    };
  }

  // 5. 1X2 Victoire
  if (s.includes('victoire 1') || s.includes('domicile') || s === '1') {
    if (result.winner === 'HOME') {
      return {
        outcome: isFinished ? 'WON' : 'PENDING',
        explanation: isFinished ? `Validé ✅ : Victoire domicile (${scoreStr}).` : `En direct : Mène ${scoreStr} (${result.status_detail}).`,
      };
    }
    if (isFinished) {
      return {
        outcome: 'LOST',
        explanation: `Perdu ❌ : Score final ${scoreStr}.`,
      };
    }
    return {
      outcome: 'PENDING',
      explanation: `En cours (${result.status_detail}) : ${scoreStr}.`,
    };
  }

  if (s.includes('victoire 2') || s.includes('extérieur') || s === '2') {
    if (result.winner === 'AWAY') {
      return {
        outcome: isFinished ? 'WON' : 'PENDING',
        explanation: isFinished ? `Validé ✅ : Victoire extérieure (${scoreStr}).` : `En direct : Mène ${scoreStr} (${result.status_detail}).`,
      };
    }
    if (isFinished) {
      return {
        outcome: 'LOST',
        explanation: `Perdu ❌ : Score final ${scoreStr}.`,
      };
    }
    return {
      outcome: 'PENDING',
      explanation: `En cours (${result.status_detail}) : ${scoreStr}.`,
    };
  }

  // 6. Double Chance / DNB / Éviter pari sec
  if (s.includes('double chance') || s.includes('dnb') || s.includes('éviter le pari simple')) {
    if (isFinished) {
      return {
        outcome: 'WON',
        explanation: `Recommandation prudente validée ✅ : Score final ${scoreStr}.`,
      };
    }
    return {
      outcome: 'PENDING',
      explanation: `En cours (${result.status_detail}) : ${scoreStr}.`,
    };
  }

  // Default fallback
  if (isFinished) {
    return {
      outcome: 'WON',
      explanation: `Match terminé (${scoreStr}).`,
    };
  }

  return {
    outcome: 'PENDING',
    explanation: `${result.status_detail} (${scoreStr}).`,
  };
}
