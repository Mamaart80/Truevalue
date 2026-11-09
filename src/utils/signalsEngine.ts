import type { ScrapedMatch, CrossMarketSignal, SignalCategory, MarketKey } from '../types.ts';
import { getMarketDef } from '../data/markets.ts';

export function generateCrossMarketSignals(allMatchesByMarket: Record<string, ScrapedMatch[]>): CrossMarketSignal[] {
  // 1. Group matches by normalized fixture key: "home vs away"
  const fixturesMap: Record<string, {
    home: string;
    away: string;
    league: string;
    country: string;
    flag_url: string;
    date_formatted: string;
    matches: Record<string, ScrapedMatch>;
  }> = {};

  Object.entries(allMatchesByMarket).forEach(([mKey, matches]) => {
    if (!Array.isArray(matches)) return;

    matches.forEach(m => {
      // Only consider matches with real volume
      if ((m.total_volume || 0) <= 0) return;

      const h = m.home.trim().toLowerCase();
      const a = m.away.trim().toLowerCase();
      if (!h || !a) return;

      const key = `${h}_vs_${a}`;
      if (!fixturesMap[key]) {
        fixturesMap[key] = {
          home: m.home,
          away: m.away,
          league: m.league,
          country: m.country,
          flag_url: m.flag_url,
          date_formatted: m.date_formatted,
          matches: {},
        };
      }
      fixturesMap[key].matches[mKey] = m;
    });
  });

  const signals: CrossMarketSignal[] = [];

  // 2. Evaluate ONLY fixtures that have AT LEAST 2 distinct genuinely detected markets
  Object.entries(fixturesMap).forEach(([fixtureKey, fixture], idx) => {
    const activeMarketEntries = Object.entries(fixture.matches).filter(([_, m]) => (m.total_volume || 0) > 0);

    // CRITICAL: Must have at least 2 real markets to interpret cross-market signals!
    if (activeMarketEntries.length < 2) {
      return;
    }

    const marketsIncluded = activeMarketEntries.map(([mKey, m]) => {
      const mDef = getMarketDef(mKey as MarketKey);
      return {
        market_key: mKey as MarketKey,
        market_label: mDef.shortLabel,
        dominant_outcome: m.dominant_outcome,
        dominant_pct: m.dominant_pct,
        coef: m.dominant_outcome === m.label_1 ? m.coef_1_new : m.dominant_outcome === m.label_2 ? m.coef_2_new : m.coef_x_new,
        volume: m.total_volume,
        signal_label: m.signal_label,
      };
    });

    const totalVolumeCombined = activeMarketEntries.reduce((sum, [_, m]) => sum + m.total_volume, 0);

    // Detected markets strictly present
    const m1x2 = fixture.matches['1x2'];
    const mOU25 = fixture.matches['over-under-2-5'];
    const mOU15 = fixture.matches['over-under-1-5'];
    const mOU35 = fixture.matches['over-under-3-5'];
    const mBtts = fixture.matches['btts'];
    const mScore = fixture.matches['correct-score'];
    const mDnb = fixture.matches['dnb'];
    const mDc = fixture.matches['double-chance'];
    const mHt = fixture.matches['half-time'];

    // Factual extraction
    const hasOU25 = !!mOU25;
    const isOver25 = mOU25 ? (mOU25.dominant_outcome.toLowerCase().includes('plus') && mOU25.dominant_pct >= 52) : false;
    const isUnder25 = mOU25 ? (mOU25.dominant_outcome.toLowerCase().includes('moins') && mOU25.dominant_pct >= 52) : false;

    const hasBtts = !!mBtts;
    const isBttsYes = mBtts ? (mBtts.dominant_outcome.toLowerCase().includes('oui') && mBtts.dominant_pct >= 52) : false;
    const isBttsNo = mBtts ? (mBtts.dominant_outcome.toLowerCase().includes('non') && mBtts.dominant_pct >= 52) : false;

    const hasScore = !!mScore && Array.isArray(mScore.outcomes) && mScore.outcomes.length > 0;
    let topScoreLabel: string | null = null;
    let isScoreHigh = false;
    let isScoreLow = false;
    if (hasScore && mScore.outcomes) {
      topScoreLabel = mScore.outcomes[0]?.label || null;
      if (topScoreLabel) {
        const parts = topScoreLabel.split('-').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const sumGoals = parts[0] + parts[1];
          if (sumGoals >= 3) isScoreHigh = true;
          if (sumGoals <= 2) isScoreLow = true;
        }
      }
    }

    const has1x2 = !!m1x2;
    const hasDnb = !!mDnb;
    const hasDc = !!mDc;

    // Build factually grounded sentences citing ONLY detected markets
    const marketBullets = activeMarketEntries.map(([_, m]) => {
      const def = getMarketDef(m.market_key);
      return `${def.shortLabel} (${m.dominant_outcome} à ${m.dominant_pct}% avec £${Math.round(m.total_volume).toLocaleString('en-GB')})`;
    }).join(', ');

    let category: SignalCategory = 'NEUTRAL_OPPORTUNITY';
    let convergenceScore = 65;
    let scenarioTitle = 'Flux Croisés Actifs';
    let analysisSummary = `Marchés recoupés : ${marketBullets}. Les volumes circulent sans biais contradictoire majeur.`;
    let valuePlay = has1x2 ? `${m1x2.dominant_outcome} @${m1x2.coef_1_new.toFixed(2)}` : `${marketsIncluded[0].dominant_outcome}`;
    let safetyPlay = 'Sélection sécurisée ou observation en direct';
    let badgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
    let categoryLabel = 'Neutre';

    // 1. REAL DIVERGENCE DETECTION (Real contradictions between actual detected markets)
    // Contradiction A: 1X2 vs Double Chance contradiction
    const dcFavorsHomeOrDraw = mDc && mDc.dominant_outcome.includes('1X') && mDc.dominant_pct >= 65;
    const dcFavorsAwayOrDraw = mDc && mDc.dominant_outcome.includes('X2') && mDc.dominant_pct >= 65;
    const dcFavorsNoDraw = mDc && mDc.dominant_outcome.includes('12') && mDc.dominant_pct >= 65;

    const oneXTwoFavorsAway = m1x2 && (m1x2.dominant_outcome.includes('2') || m1x2.dominant_outcome.includes('Ext')) && m1x2.dominant_pct >= 60;
    const oneXTwoFavorsHome = m1x2 && (m1x2.dominant_outcome.includes('1') || m1x2.dominant_outcome.includes('Dom')) && m1x2.dominant_pct >= 60;
    const oneXTwoFavorsDraw = m1x2 && (m1x2.dominant_outcome.includes('X') || m1x2.dominant_outcome.includes('Nul')) && m1x2.dominant_pct >= 50;

    const dnbFavorsHome = mDnb && (mDnb.dominant_outcome.includes('1') || mDnb.dominant_outcome.includes('Dom')) && mDnb.dominant_pct >= 65;
    const dnbFavorsAway = mDnb && (mDnb.dominant_outcome.includes('2') || mDnb.dominant_outcome.includes('Ext')) && mDnb.dominant_pct >= 65;

    // Test real contradictions
    const isContradiction1x2VsDc = (oneXTwoFavorsAway && dcFavorsHomeOrDraw) || (oneXTwoFavorsHome && dcFavorsAwayOrDraw);
    const isContradiction1x2VsDnb = (oneXTwoFavorsAway && dnbFavorsHome) || (oneXTwoFavorsHome && dnbFavorsAway);
    const isContradiction1x2VsDrawDc = oneXTwoFavorsDraw && dcFavorsNoDraw;
    const isContradictionOverScore = hasOU25 && hasScore && isOver25 && isScoreLow;
    const isContradictionUnderScore = hasOU25 && hasScore && isUnder25 && isScoreHigh;
    const isContradictionUnderBtts = hasOU25 && hasBtts && isUnder25 && isBttsYes && (mOU25?.dominant_pct || 0) >= 65 && (mBtts?.dominant_pct || 0) >= 65;

    if (isContradiction1x2VsDc || isContradiction1x2VsDnb || isContradictionOverScore || isContradictionUnderScore || isContradictionUnderBtts || isContradiction1x2VsDrawDc) {
      category = 'DIVERGENCE_WARNING';
      convergenceScore = 25;
      badgeColor = 'bg-rose-50 text-rose-700 border-rose-300';
      categoryLabel = '⚠️ Alerte Divergence';
      scenarioTitle = 'Contradiction des Marchés (Alerte Piège)';

      if (isContradiction1x2VsDc) {
        analysisSummary = `Contradiction nette entre le marché 1X2 (${m1x2.dominant_outcome} à ${m1x2.dominant_pct}%) et la Double Chance (${mDc.dominant_outcome} à ${mDc.dominant_pct}%). Les capitaux s'opposent frontalement sur le résultat.`;
      } else if (isContradiction1x2VsDnb) {
        analysisSummary = `Divergence détectée entre le marché 1X2 (${m1x2.dominant_outcome} à ${m1x2.dominant_pct}%) et le Remboursé si Nul DNB (${mDnb.dominant_outcome} à ${mDnb.dominant_pct}%). Deux tendances inverses sont financées.`;
      } else if (isContradictionOverScore && topScoreLabel) {
        analysisSummary = `Divergence : Le marché Plus/Moins 2.5 mise sur l'Over (${mOU25.dominant_pct}%), alors que le marché Score Exact concentre ses mises sur un score fermé (${topScoreLabel}).`;
      } else if (isContradictionUnderBtts) {
        analysisSummary = `Divergence Buts : Le marché Plus/Moins 2.5 mise sur l'Under (${mOU25.dominant_pct}%), tandis que le BTTS mise sur 'Les deux équipes marquent Oui' (${mBtts.dominant_pct}%). La marge de réalisation est extrêmement étroite.`;
      } else {
        analysisSummary = `Contradiction statistique entre les marchés réellement détectés (${marketBullets}). Les flux des parieurs se neutralisent ou révèlent un piège.`;
      }

      valuePlay = 'Éviter le pari simple sec';
      safetyPlay = 'Couverture Double Chance ou s\'abstenir';
    }
    // 2. REAL CONVERGENCE OFFENSIVE (+Buts)
    else if ((hasOU25 && isOver25 && (isBttsYes || isScoreHigh)) || (hasOU25 && (mOU25.dominant_pct >= 70) && isOver25)) {
      category = 'CONVERGENCE_OVER';
      convergenceScore = 92;
      badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300';
      categoryLabel = '🎯 Convergence +Buts';
      scenarioTitle = 'Scénario Prolifique Validé (+2.5 Buts)';

      const parts: string[] = [];
      if (hasOU25) parts.push(`Plus de 2.5 Buts (${mOU25.dominant_pct}% du volume)`);
      if (hasBtts && isBttsYes) parts.push(`BTTS Oui (${mBtts.dominant_pct}%)`);
      if (hasScore && topScoreLabel) parts.push(`Score Exact (${topScoreLabel})`);
      if (has1x2 && (m1x2.dominant_pct >= 70)) parts.push(`pression offensive 1X2 sur ${m1x2.dominant_outcome}`);

      analysisSummary = `Les marchés détectés pour ce match confirment tous un profil ouvert : ${parts.join(', ')}. Les capitaux réels Betfair soutiennent une probabilité élevée de buts.`;
      valuePlay = `Plus de 2.5 Buts @${mOU25 ? mOU25.coef_2_new.toFixed(2) : '1.80'}`;
      safetyPlay = `Plus de 1.5 Buts (Option Sécurité Maximale pour être à l'abri)`;
    }
    // 3. REAL CONVERGENCE DÉFENSIVE (-Buts)
    else if ((hasOU25 && isUnder25 && (isBttsNo || isScoreLow)) || (hasOU25 && (mOU25.dominant_pct >= 70) && isUnder25)) {
      category = 'CONVERGENCE_UNDER';
      convergenceScore = 90;
      badgeColor = 'bg-blue-50 text-blue-700 border-blue-300';
      categoryLabel = '🛡️ Convergence -Buts';
      scenarioTitle = 'Scénario Fermé Validé (-2.5 Buts)';

      const parts: string[] = [];
      if (hasOU25) parts.push(`Moins de 2.5 Buts (${mOU25.dominant_pct}% du volume)`);
      if (hasBtts && isBttsNo) parts.push(`BTTS Non (${mBtts.dominant_pct}%)`);
      if (hasScore && topScoreLabel) parts.push(`Score Exact (${topScoreLabel})`);

      analysisSummary = `Les marchés détectés s'accordent sur un match cadenassé : ${parts.join(', ')}. Les flux confirment un nombre restreint de réalisations.`;
      valuePlay = `Moins de 2.5 Buts @${mOU25 ? mOU25.coef_1_new.toFixed(2) : '1.75'}`;
      safetyPlay = `Moins de 3.5 Buts (Option Sécurité pour être à l'abri)`;
    }
    // 4. REAL CONVERGENCE FAVORITE DOMINATION (1X2 + DNB / Double Chance concording)
    else if (has1x2 && m1x2.dominant_pct >= 70 && ((hasDnb && (dnbFavorsHome || dnbFavorsAway)) || (hasDc && (dcFavorsHomeOrDraw || dcFavorsAwayOrDraw)))) {
      category = 'CONVERGENCE_FAVORITE';
      convergenceScore = 88;
      badgeColor = 'bg-amber-50 text-amber-700 border-amber-300';
      categoryLabel = '⚡ Consensus Favori';
      scenarioTitle = `Consensus Réel sur ${m1x2.dominant_outcome}`;

      const parts: string[] = [`1X2 (${m1x2.dominant_outcome} à ${m1x2.dominant_pct}%)`];
      if (hasDnb) parts.push(`Remboursé si Nul DNB (${mDnb.dominant_outcome} à ${mDnb.dominant_pct}%)`);
      if (hasDc) parts.push(`Double Chance (${mDc.dominant_outcome} à ${mDc.dominant_pct}%)`);

      analysisSummary = `Accord des flux détectés : ${parts.join(' et ')}. Les marchés confirment le même favori sans divergence.`;
      valuePlay = `Victoire ${m1x2.dominant_outcome} @${(m1x2.dominant_outcome === m1x2.label_1 ? m1x2.coef_1_new : m1x2.coef_2_new).toFixed(2)}`;
      safetyPlay = `DNB (Remboursé si Nul) ou Double Chance pour sécuriser`;
    }
    // 5. OTHER CONVERGENCES (e.g. Over 3.5 + 1X2 favorite)
    else if (mOU35 && mOU35.dominant_outcome.includes('Plus') && mOU35.dominant_pct >= 65) {
      category = 'CONVERGENCE_OVER';
      convergenceScore = 85;
      badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300';
      categoryLabel = '🎯 Convergence +Buts';
      scenarioTitle = 'Pression Forte sur Totaux de Buts Élevés';
      analysisSummary = `Le marché Plus/Moins 3.5 Buts enregistre ${mOU35.dominant_pct}% du volume sur l'Over, recoupé avec ${has1x2 ? `le marché 1X2 sur ${m1x2.dominant_outcome}` : 'les autres marchés réels'}.`;
      valuePlay = `Plus de 2.5 Buts`;
      safetyPlay = `Plus de 1.5 Buts (Sécurité Maximale)`;
    } else {
      category = 'NEUTRAL_OPPORTUNITY';
      convergenceScore = 60;
      badgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
      categoryLabel = '📊 Recoupement Neutre';
      scenarioTitle = `Marchés concordants sans anomalie`;
      analysisSummary = `Marchés réellement enregistrés pour cette affiche : ${marketBullets}. Répartition classique sans signal extrême de divergence.`;
      valuePlay = `${marketsIncluded[0].dominant_outcome} (@${marketsIncluded[0].coef.toFixed(2)})`;
      safetyPlay = 'Parier avec modération ou surveiller l\'évolution des cotes avant match';
    }

    signals.push({
      id: `sig_${fixtureKey}_${idx}`,
      fixture_key: fixtureKey,
      home: fixture.home,
      away: fixture.away,
      league: fixture.league,
      country: fixture.country,
      flag_url: fixture.flag_url,
      date_formatted: fixture.date_formatted,
      convergence_score: convergenceScore,
      category,
      category_label: categoryLabel,
      badge_color: badgeColor,
      scenario_title: scenarioTitle,
      analysis_summary: analysisSummary,
      value_play: valuePlay,
      safety_play: safetyPlay,
      total_volume_combined: Math.round(totalVolumeCombined * 100) / 100,
      markets_included: marketsIncluded,
      raw_matches: fixture.matches,
    });
  });

  // Sort: Divergence warnings and High convergence first, then by combined volume
  return signals.sort((a, b) => {
    if (a.category === 'DIVERGENCE_WARNING' && b.category !== 'DIVERGENCE_WARNING') return -1;
    if (b.category === 'DIVERGENCE_WARNING' && a.category !== 'DIVERGENCE_WARNING') return 1;
    if (a.convergence_score !== b.convergence_score) return b.convergence_score - a.convergence_score;
    return b.total_volume_combined - a.total_volume_combined;
  });
}
