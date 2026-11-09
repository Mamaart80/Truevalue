import type { ScrapedMatch, MarketKey, ScoreOutcome } from '../types.ts';
import { getMarketDef } from '../data/markets.ts';

export function parseAndEnrichMatches(rawList: any[], marketKey: MarketKey = '1x2'): ScrapedMatch[] {
  const marketDef = getMarketDef(marketKey);
  const isTwoWay = marketDef.type === '2_way';
  const isMulti = marketDef.type === 'multi';

  return (rawList || []).map((item, idx) => {
    // 1. Correct Score / Multi-Outcome handling
    if (isMulti && Array.isArray(item.outcomes)) {
      const outcomes: ScoreOutcome[] = item.outcomes.map((o: any) => ({
        label: o.label || '',
        coef: Number(o.coef) || null,
        coef_new: Number(o.coef_new) || null,
        volume: Number(o.volume) || 0,
      }));

      const totalVol = outcomes.reduce((sum, o) => sum + o.volume, 0);
      outcomes.forEach(o => {
        o.pct = totalVol > 0 ? Math.round((o.volume / totalVol) * 1000) / 10 : 0;
      });

      // Sort outcomes by volume descending
      const sortedOutcomes = [...outcomes].sort((a, b) => b.volume - a.volume);
      const top1 = sortedOutcomes[0] || { label: '1-0', coef_new: 7.0, volume: 0, pct: 0 };
      const top2 = sortedOutcomes[1] || { label: '1-1', coef_new: 6.5, volume: 0, pct: 0 };
      const top3 = sortedOutcomes[2] || { label: '2-1', coef_new: 8.5, volume: 0, pct: 0 };

      const c1_new = top1.coef_new || 5.0;
      const cx_new = top2.coef_new || 6.0;
      const c2_new = top3.coef_new || 7.0;

      let liquidityTier: ScrapedMatch['liquidity_tier'] = 'LOW';
      if (totalVol >= 25000) liquidityTier = 'WHALE';
      else if (totalVol >= 5000) liquidityTier = 'HIGH';
      else if (totalVol >= 1000) liquidityTier = 'MEDIUM';

      const dominant = top1.label || 'Score Favori';
      const maxPct = top1.pct || 0;

      let signalType: ScrapedMatch['signal_type'] = 'BALANCED';
      let signalLabel = 'Distribution Normale';
      let signalColor = 'text-slate-400 bg-slate-800/40 border-slate-700/50';

      if (maxPct >= 50 && totalVol >= 1000) {
        signalType = 'WHALE_ACCUMULATION';
        signalLabel = `Concentration Forte (${dominant} ${maxPct}%)`;
        signalColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
      }

      let dateFormatted = item.date || '';
      try {
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) {
          dateFormatted = d.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch {
        // fallback
      }

      return {
        id: `${item.market_id || 'cs'}_${item.selection_id || idx}_${idx}`,
        date: item.date || '',
        date_formatted: dateFormatted,
        sport: item.sport || 1,
        country: item.country || 'GLOBAL',
        league: item.leage || item.league || 'Football',
        odds_type: item.odds_type || 'CORRECT_SCORE',
        home: item.home || 'Équipe 1',
        away: item.away || 'Équipe 2',
        market_id: item.market_id || idx,
        selection_id: item.selection_id || idx,
        last_update: item.last_update || '',

        market_key: marketKey,
        market_type: 'multi',
        label_1: top1.label || 'Top 1',
        label_x: top2.label || 'Top 2',
        label_2: top3.label || 'Top 3',

        coef_1: c1_new,
        coef_x: cx_new,
        coef_2: c2_new,

        coef_1_new: c1_new,
        coef_x_new: cx_new,
        coef_2_new: c2_new,

        volume_1: top1.volume,
        volume_x: top2.volume,
        volume_2: top3.volume,
        total_volume: Math.round(totalVol * 100) / 100,

        pct_1: top1.pct || 0,
        pct_x: top2.pct || 0,
        pct_2: top3.pct || 0,

        drop_1_pct: 0,
        drop_x_pct: 0,
        drop_2_pct: 0,

        implied_prob_1: c1_new > 0 ? Math.round((1 / c1_new) * 1000) / 10 : 0,
        implied_prob_x: cx_new > 0 ? Math.round((1 / cx_new) * 1000) / 10 : 0,
        implied_prob_2: c2_new > 0 ? Math.round((1 / c2_new) * 1000) / 10 : 0,

        divergence_1: 0,
        divergence_x: 0,
        divergence_2: 0,

        dominant_outcome: dominant,
        dominant_pct: maxPct,
        smart_money_score: Math.min(100, 30 + (maxPct >= 50 ? 40 : 10) + (totalVol >= 5000 ? 30 : 10)),
        signal_type: signalType,
        signal_label: signalLabel,
        signal_color: signalColor,
        liquidity_tier: liquidityTier,
        outcomes: sortedOutcomes.slice(0, 8),

        betfair_chart_url: `https://graphs.betfair.com/1.${item.market_id || ''}/${item.selection_id || ''}/0`,
        betfair_market_url: `https://www.betfair.com/exchange/plus/football/market/1.${item.market_id || ''}`,
        flag_url: item.country ? `https://arbworld.net/assets/images/flags/${item.country}.webp` : '',
      };
    }

    // 2. Standard 2-way or 3-way markets
    const vol1 = Number(item.volume_1) || 0;
    const volX = isTwoWay ? 0 : (Number(item.volume_x) || 0);
    const vol2 = Number(item.volume_2) || 0;
    const totalVol = Math.round((vol1 + volX + vol2) * 100) / 100;

    const pct1 = totalVol > 0 ? Math.round((vol1 / totalVol) * 1000) / 10 : 0;
    const pctX = isTwoWay ? 0 : (totalVol > 0 ? Math.round((volX / totalVol) * 1000) / 10 : 0);
    const pct2 = totalVol > 0 ? Math.round((vol2 / totalVol) * 1000) / 10 : 0;

    const c1 = Number(item.coef_1) || 1;
    const cx = isTwoWay ? 0 : (Number(item.coef_x) || 1);
    const c2 = Number(item.coef_2) || 1;

    const c1_new = Number(item.coef_1_new) || c1;
    const cx_new = isTwoWay ? 0 : (Number(item.coef_x_new) || cx);
    const c2_new = Number(item.coef_2_new) || c2;

    // Drop percentages
    const drop1 = c1 > 0 ? Math.round(((c1_new - c1) / c1) * 1000) / 10 : 0;
    const dropX = cx > 0 ? Math.round(((cx_new - cx) / cx) * 1000) / 10 : 0;
    const drop2 = c2 > 0 ? Math.round(((c2_new - c2) / c2) * 1000) / 10 : 0;

    // Implied probabilities (margin normalized)
    const rawImp1 = c1_new > 0 ? 1 / c1_new : 0;
    const rawImpX = (!isTwoWay && cx_new > 0) ? 1 / cx_new : 0;
    const rawImp2 = c2_new > 0 ? 1 / c2_new : 0;
    const sumImp = rawImp1 + rawImpX + rawImp2;

    const imp1 = sumImp > 0 ? Math.round((rawImp1 / sumImp) * 1000) / 10 : 0;
    const impX = sumImp > 0 && !isTwoWay ? Math.round((rawImpX / sumImp) * 1000) / 10 : 0;
    const imp2 = sumImp > 0 ? Math.round((rawImp2 / sumImp) * 1000) / 10 : 0;

    const div1 = Math.round((pct1 - imp1) * 10) / 10;
    const divX = isTwoWay ? 0 : Math.round((pctX - impX) * 10) / 10;
    const div2 = Math.round((pct2 - imp2) * 10) / 10;

    // Determine dominant outcome label
    let dominantCode: '1' | 'X' | '2' = '1';
    let dominantName = marketDef.labels.opt1;
    let maxPct = pct1;

    if (!isTwoWay && pctX > maxPct) {
      dominantCode = 'X';
      dominantName = marketDef.labels.optX || 'Nul';
      maxPct = pctX;
    }
    if (pct2 > maxPct) {
      dominantCode = '2';
      dominantName = marketDef.labels.opt2;
      maxPct = pct2;
    }

    // Liquidity tier
    let liquidityTier: ScrapedMatch['liquidity_tier'] = 'LOW';
    if (totalVol >= 30000) liquidityTier = 'WHALE';
    else if (totalVol >= 7000) liquidityTier = 'HIGH';
    else if (totalVol >= 1200) liquidityTier = 'MEDIUM';

    // Smart Money Scoring & Signals
    let score = 20;
    let signalType: ScrapedMatch['signal_type'] = 'BALANCED';
    let signalLabel = 'Flux Normal';
    let signalColor = 'text-slate-400 bg-slate-800/40 border-slate-700/50';

    const dominantDrop = dominantCode === '1' ? drop1 : dominantCode === 'X' ? dropX : drop2;
    const dominantOdds = dominantCode === '1' ? c1_new : dominantCode === 'X' ? cx_new : c2_new;

    // 1. Extreme Volume Concentration (Whale)
    if (maxPct >= 78 && totalVol >= 1500) {
      score += 45;
      signalType = 'WHALE_ACCUMULATION';
      signalLabel = `Concentration Forte (${maxPct}% sur ${dominantName})`;
      signalColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
    }
    // 2. Sharp Drop: Odds shortened significantly with volume
    else if (dominantDrop <= -7 && maxPct >= 58 && totalVol >= 500) {
      score += 40;
      signalType = 'SHARP_DROP';
      signalLabel = `Chute de Cote (${dominantDrop}% sur ${dominantName})`;
      signalColor = 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30';
    }
    // 3. Underdog Surge: Heavy money backing high odds (> 2.30 with > 55% volume)
    else if (dominantOdds >= 2.30 && maxPct >= 55 && totalVol >= 600) {
      score += 35;
      signalType = 'UNDERDOG_SURGE';
      signalLabel = `Anomalie Outsider (${maxPct}% @ ${dominantOdds.toFixed(2)})`;
      signalColor = 'text-amber-400 bg-amber-950/40 border-amber-500/30';
    }
    // 4. Favorite Steam
    else if (dominantOdds <= 1.65 && maxPct >= 68) {
      score += 25;
      signalType = 'FAVORITE_STEAM';
      signalLabel = `Pression Favori (${maxPct}%)`;
      signalColor = 'text-indigo-400 bg-indigo-950/40 border-indigo-500/30';
    }

    if (totalVol >= 30000) score += 20;
    else if (totalVol >= 7000) score += 10;
    score = Math.min(100, Math.max(10, score));

    const marketIdStr = String(item.market_id || '');
    const selectionIdStr = String(item.selection_id || '');

    let dateFormatted = item.date || '';
    try {
      const d = new Date(item.date);
      if (!isNaN(d.getTime())) {
        dateFormatted = d.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch {
      // fallback
    }

    return {
      id: `${item.market_id || marketKey}_${item.selection_id || idx}_${idx}`,
      date: item.date || '',
      date_formatted: dateFormatted,
      sport: item.sport || 1,
      country: item.country || 'GLOBAL',
      league: item.leage || item.league || 'Football',
      odds_type: item.odds_type || marketDef.arbworldMarket,
      home: item.home || 'Équipe 1',
      away: item.away || 'Équipe 2',
      market_id: item.market_id,
      selection_id: item.selection_id,
      last_update: item.last_update || '',

      market_key: marketKey,
      market_type: marketDef.type,
      label_1: marketDef.labels.opt1,
      label_x: marketDef.labels.optX,
      label_2: marketDef.labels.opt2,

      coef_1: c1,
      coef_x: cx,
      coef_2: c2,

      coef_1_new: c1_new,
      coef_x_new: cx_new,
      coef_2_new: c2_new,

      volume_1: vol1,
      volume_x: volX,
      volume_2: vol2,
      total_volume: totalVol,

      pct_1: pct1,
      pct_x: pctX,
      pct_2: pct2,

      drop_1_pct: drop1,
      drop_x_pct: dropX,
      drop_2_pct: drop2,

      implied_prob_1: imp1,
      implied_prob_x: impX,
      implied_prob_2: imp2,

      divergence_1: div1,
      divergence_x: divX,
      divergence_2: div2,

      dominant_outcome: dominantName,
      dominant_pct: maxPct,
      smart_money_score: score,
      signal_type: signalType,
      signal_label: signalLabel,
      signal_color: signalColor,
      liquidity_tier: liquidityTier,

      betfair_chart_url: `https://graphs.betfair.com/1.${marketIdStr}/${selectionIdStr}/0`,
      betfair_market_url: `https://www.betfair.com/exchange/plus/football/market/1.${marketIdStr}`,
      flag_url: item.country ? `https://arbworld.net/assets/images/flags/${item.country}.webp` : '',
    };
  });
}
