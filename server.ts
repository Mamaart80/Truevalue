import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

import { MARKET_FALLBACKS } from './src/data/marketFallbacks.ts';
import { parseAndEnrichMatches } from './src/utils/enrichMatches.ts';
import { FOOTBALL_MARKETS, getMarketDef, type MarketKey } from './src/data/markets.ts';
import type { ScrapedMatch, EspnMatchResult, SignalVerification } from './src/types.ts';
import { generateCrossMarketSignals } from './src/utils/signalsEngine.ts';
import { 
  SUPPORTED_LEAGUES, 
  parseEspnEvent, 
  findMatchingEspnEvent, 
  verifySelectionAgainstResult 
} from './src/utils/resultsService.ts';

app.use(express.json());

// Enable CORS for iframe and client requests
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Initialize Google Gemini AI if valid API key is provided
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && !apiKey.startsWith('MY_')) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Could not initialize GoogleGenAI with provided key:', err);
  }
}

// Memory cache to avoid spamming arbworld
interface CacheEntry {
  timestamp: number;
  data: {
    data: ScrapedMatch[];
    meta: any;
  };
}
const cache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 25000; // 25 seconds fresh cache
const STALE_TTL_MS = 180000; // 3 minutes stale-while-revalidate window

// Deduplicate in-flight fetch promises to prevent redundant requests
const inFlightScrapes: Map<string, Promise<{ data: ScrapedMatch[]; meta: any }>> = new Map();

// Scrape Arbworld Endpoint for any Football Market with resilient timeout, deduplication and stale-while-revalidate
async function scrapeArbworldMarket(marketKey: MarketKey, force = false): Promise<{ data: ScrapedMatch[]; meta: any }> {
  const targetUrl = `https://arbworld.net/fr/moneyway/football/${marketKey}`;
  const now = Date.now();
  const cached = cache[marketKey];

  // 1. Fresh cache hit: Return immediately
  if (!force && cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Stale-while-revalidate: If not forced and we have cached data within stale window,
  // return cached data immediately and refresh asynchronously in the background.
  if (!force && cached && (now - cached.timestamp) < STALE_TTL_MS && cached.data.data.length > 0) {
    if (!inFlightScrapes.has(marketKey)) {
      // Trigger background refresh
      const bgPromise = executeScrape(marketKey, targetUrl).finally(() => {
        inFlightScrapes.delete(marketKey);
      });
      inFlightScrapes.set(marketKey, bgPromise);
    }
    return cached.data;
  }

  // 3. If a request for this market is already in-flight, await it rather than launching a duplicate
  if (!force && inFlightScrapes.has(marketKey)) {
    return inFlightScrapes.get(marketKey)!;
  }

  const scrapePromise = executeScrape(marketKey, targetUrl).finally(() => {
    inFlightScrapes.delete(marketKey);
  });
  inFlightScrapes.set(marketKey, scrapePromise);

  return scrapePromise;
}

async function executeScrape(marketKey: MarketKey, targetUrl: string): Promise<{ data: ScrapedMatch[]; meta: any }> {
  const now = Date.now();
  let rawData: any[] = [];
  let meta: any = { source: targetUrl, market_key: marketKey, scraped_at: new Date().toISOString() };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();
      const scriptRegex = /<script[^>]*>(\s*\{\s*\"success\"\s*:\s*true[\s\S]*?\})\s*<\/script>/;
      const match = html.match(scriptRegex);

      if (match && match[1]) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed.data)) {
            rawData = parsed.data;
            meta.data_updated_at = parsed.data_updated_at;
            meta.data_age_seconds = parsed.data_age_seconds;
          }
        } catch (e) {
          console.error(`Failed to parse embedded JSON for ${marketKey}:`, e);
        }
      }
    } else {
      console.warn(`Arbworld HTTP ${response.status} on ${targetUrl}, using cached or fallback`);
    }
  } catch (err: any) {
    console.warn(`Arbworld fetch failed (${err.message}) on ${targetUrl}, using cached or fallback`);
  }

  // If live fetch failed or returned empty data, use existing cache or fallback snapshot
  if (rawData.length === 0) {
    if (cache[marketKey] && cache[marketKey].data?.data?.length > 0) {
      return {
        ...cache[marketKey].data,
        meta: {
          ...cache[marketKey].data.meta,
          is_stale: true,
          scraped_at: new Date().toISOString(),
        }
      };
    }

    if (MARKET_FALLBACKS[marketKey] && Array.isArray(MARKET_FALLBACKS[marketKey])) {
      rawData = MARKET_FALLBACKS[marketKey];
      meta.is_fallback = true;
    }
  }

  const enriched = parseAndEnrichMatches(rawData, marketKey);
  const result = {
    data: enriched,
    meta: {
      ...meta,
      total_matches: enriched.length,
      total_volume_slate: enriched.reduce((sum, m) => sum + m.total_volume, 0),
    }
  };

  cache[marketKey] = {
    timestamp: now,
    data: result,
  };

  return result;
}

// REST API Routes

// 1. Generic Moneyway Football Market route (e.g. 1x2, over-under-2-5, btts, etc.)
app.get('/api/moneyway/football/:marketKey', async (req: Request, res: Response) => {
  try {
    const rawKey = req.params.marketKey as string;
    const marketDef = FOOTBALL_MARKETS.find(m => m.key === rawKey) || FOOTBALL_MARKETS[0];
    const marketKey = marketDef.key;
    const force = req.query.force === 'true';

    const result = await scrapeArbworldMarket(marketKey, force);
    res.json({
      success: true,
      market: marketKey,
      url: `https://arbworld.net/fr/moneyway/football/${marketKey}`,
      ...result,
    });
  } catch (error: any) {
    console.error(`Error scraping market ${req.params.marketKey}:`, error);
    res.status(500).json({
      success: false,
      market: req.params.marketKey,
      error: error.message || 'Erreur lors du scraping de Arbworld',
    });
  }
});

// 2. Summary of all available markets (counts & volumes for smart selector tabs)
app.get('/api/moneyway/summary', async (req: Request, res: Response) => {
  try {
    const force = req.query.force === 'true';
    const summaries = await Promise.all(
      FOOTBALL_MARKETS.map(async (m) => {
        try {
          const resData = await scrapeArbworldMarket(m.key, force);
          return {
            key: m.key,
            label: m.label,
            shortLabel: m.shortLabel,
            match_count: resData.data.length,
            total_volume: resData.meta.total_volume_slate || 0,
            dominant_trend: resData.data[0]?.signal_label || 'Flux standard',
          };
        } catch {
          return {
            key: m.key,
            label: m.label,
            shortLabel: m.shortLabel,
            match_count: 0,
            total_volume: 0,
            dominant_trend: 'Aucune donnée',
          };
        }
      })
    );

    res.json({
      success: true,
      summaries,
      total_slate_volume: summaries.reduce((acc, s) => acc + s.total_volume, 0),
    });
  } catch (error: any) {
    console.error('Error fetching market summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Cross-Market Fixture Search (Find all markets where this match appears!)
app.get('/api/moneyway/match-cross-markets', async (req: Request, res: Response) => {
  try {
    const home = (req.query.home as string || '').toLowerCase().trim();
    const away = (req.query.away as string || '').toLowerCase().trim();

    if (!home && !away) {
      return res.status(400).json({ success: false, error: 'Équipes requises' });
    }

    const marketResults = await Promise.all(
      FOOTBALL_MARKETS.map(async (mDef) => {
        try {
          const marketData = await scrapeArbworldMarket(mDef.key, false);
          const matched = marketData.data.find(m => {
            const mHome = m.home.toLowerCase();
            const mAway = m.away.toLowerCase();
            return (mHome.includes(home) || home.includes(mHome)) && (mAway.includes(away) || away.includes(mAway));
          });
          if (matched) {
            return {
              market_key: mDef.key,
              market_label: mDef.label,
              total_volume: matched.total_volume,
              dominant_label: matched.dominant_outcome,
              dominant_pct: matched.dominant_pct,
              coef_dominant: matched.dominant_outcome === matched.label_1 ? matched.coef_1_new : matched.coef_2_new,
              signal_label: matched.signal_label,
              match_id: matched.id,
              raw: matched,
            };
          }
        } catch {
          // ignore error for individual market
        }
        return null;
      })
    );

    const availableInMarkets = marketResults.filter((m): m is NonNullable<typeof m> => m !== null);

    res.json({
      success: true,
      query: { home, away },
      count: availableInMarkets.length,
      markets: availableInMarkets,
    });
  } catch (error: any) {
    console.error('Error in match cross markets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. AI Smart Money Deep Match Analysis (Gemini)
app.post('/api/ai/analyze-match', async (req: Request, res: Response) => {
  try {
    const { match, marketKey } = req.body;
    if (!match) {
      return res.status(400).json({ success: false, error: 'Données du match manquantes.' });
    }

    const activeMarketKey: MarketKey = marketKey || match.market_key || '1x2';
    const marketDef = getMarketDef(activeMarketKey);

    if (!ai) {
      // Heuristic fallback
      const dominantName = match.dominant_outcome || match.label_1 || 'Option dominante';
      const dropText = match.drop_1_pct !== undefined ? match.drop_1_pct : 0;
      
      return res.json({
        success: true,
        source: 'heuristic',
        analysis: {
          headline: `Flux soutenu sur [${marketDef.shortLabel}] : ${dominantName} (${match.dominant_pct}% du volume)`,
          marketDynamic: `Le marché ${marketDef.label} enregistre £${match.total_volume.toLocaleString()} échangés sur Betfair, dont ${match.dominant_pct}% concentrés sur ${dominantName}. Évolution de cote : ${dropText}%.`,
          sharpVsPublic: match.dominant_pct >= 80 
            ? "Mouvement de type 'Whale Accumulation' : les capitaux professionnels écrasent l'offre sur ce marché." 
            : "Répartition active des volumes avec prise de position nette sur le favori du flux.",
          impliedVsReal: `Probabilité implicite du bookmaker : ${match.implied_prob_1}% vs ${match.dominant_pct}% des mises réelles sur Betfair (Écart significatif de divergence).`,
          verdict: match.smart_money_score >= 70 ? 'Signal Fort (Smart Money confirmé)' : 'Signal Modéré',
          riskLevel: match.dominant_pct >= 85 ? 'Faible à Modéré (Forte conviction)' : 'Modéré',
          keyAdvice: `Surveillez la tenue de la cote avant le coup d'envoi. Si le volume continue de grimper sans rebond de la cote, le marché anticipe un avantage net sur ce marché ${marketDef.shortLabel}.`
        }
      });
    }

    const prompt = `Tu es un expert mondial en analyse de flux de paris sportifs Betfair Exchange et Moneyway (Trading de cotes, détection de Sharp Money et Arbitrage).
Analyse les données suivantes pour ce match de football récupéré en direct sur Arbworld :

Marché : ${marketDef.label} (${activeMarketKey})
Match : ${match.home} vs ${match.away}
Ligue : ${match.league} (${match.country})
Date : ${match.date_formatted}
Volume total échangé sur ce marché : £${match.total_volume.toLocaleString()}

Option 1 (${match.label_1}) : Cote ${match.coef_1_new} | Volume £${match.volume_1.toLocaleString()} (${match.pct_1}%) | Drop : ${match.drop_1_pct}%
${match.label_x ? `Option X (${match.label_x}) : Cote ${match.coef_x_new} | Volume £${match.volume_x.toLocaleString()} (${match.pct_x}%) | Drop : ${match.drop_x_pct}%` : ''}
Option 2 (${match.label_2}) : Cote ${match.coef_2_new} | Volume £${match.volume_2.toLocaleString()} (${match.pct_2}%) | Drop : ${match.drop_2_pct}%

Option dominante des flux : ${match.dominant_outcome} avec ${match.dominant_pct}% du volume.
Probabilités implicites calculées : ${match.implied_prob_1}% vs ${match.implied_prob_2}%

Fournis une analyse concise, percutante et professionnelle structurée en JSON valide avec EXACTEMENT ces clés :
{
  "headline": "Titre percutant résumant le mouvement clé sur ce marché",
  "marketDynamic": "Explication de ce que racontent les flux d'argent sur ce marché spécifique",
  "sharpVsPublic": "Est-ce un mouvement de Smart Money professionnel, un piège public, ou une baisse de cote justifiée ?",
  "impliedVsReal": "Analyse de la divergence entre les cotes proposées et les volumes réels posés",
  "verdict": "Verdict clair (ex: Signal Fort Smart Money / Valeur Détectée / Prudence / Piège)",
  "riskLevel": "Faible / Modéré / Élevé",
  "keyAdvice": "Conseil stratégique pour le parieur ou trader sur ce marché précis"
}
Réponds UNIQUEMENT avec le JSON, sans balise markdown superflu.`;

    let parsedAi: any = null;
    try {
      const responseContent = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = responseContent.text || '{}';
      parsedAi = JSON.parse(text);
    } catch (modelErr) {
      console.warn('gemini-3.8-flash error, falling back to heuristic:', modelErr);
      const dominantName = match.dominant_outcome || match.label_1;
      parsedAi = {
        headline: `Flux soutenu sur ${dominantName} (${match.dominant_pct}% du volume total)`,
        marketDynamic: `Volume échangé de £${match.total_volume.toLocaleString()} dont ${match.dominant_pct}% concentré sur ${dominantName} dans le marché ${marketDef.shortLabel}.`,
        sharpVsPublic: match.dominant_pct >= 75 ? 'Pression nette des capitaux informés sur le marché d\'échange Betfair.' : 'Activité équilibrée avec avantage sur la sélection favorite.',
        impliedVsReal: `Probabilité implicite du bookmaker vs ${match.dominant_pct}% des mises réelles.`,
        verdict: match.smart_money_score >= 70 ? 'Signal Fort Smart Money' : 'Positionnement Standard',
        riskLevel: match.dominant_pct >= 80 ? 'Modéré' : 'Moyen',
        keyAdvice: `Surveillez la tenue de la cote avant le coup d'envoi.`
      };
    }

    return res.json({
      success: true,
      source: 'gemini-3.8-flash',
      analysis: parsedAi,
    });
  } catch (error: any) {
    console.error('AI Analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Automated Cross-Market Intelligence & Convergence/Divergence Matrix
app.get('/api/moneyway/signals/matrix', async (req: Request, res: Response) => {
  try {
    const force = req.query.force === 'true';
    const allMatchesMap: Record<string, ScrapedMatch[]> = {};

    await Promise.all(
      FOOTBALL_MARKETS.map(async (mDef) => {
        try {
          const resData = await scrapeArbworldMarket(mDef.key, force);
          allMatchesMap[mDef.key] = resData.data;
        } catch {
          allMatchesMap[mDef.key] = [];
        }
      })
    );

    const signals = generateCrossMarketSignals(allMatchesMap);
    res.json({
      success: true,
      signals,
      total_analyzed: signals.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating signals matrix:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Deep AI Synthesis of Cross-Market Signals
app.post('/api/ai/analyze-signals', async (req: Request, res: Response) => {
  try {
    const { signal } = req.body;
    if (!signal) {
      return res.status(400).json({ success: false, error: 'Signal manquant.' });
    }

    if (!ai) {
      return res.json({
        success: true,
        source: 'heuristic',
        analysis: {
          headline: `${signal.scenario_title} (${signal.convergence_score}% de convergence)`,
          marketSynthesis: signal.analysis_summary,
          recommendedPlay: signal.value_play,
          safetyNet: signal.safety_play,
          sharpVsPublic: signal.category === 'DIVERGENCE_WARNING' 
            ? "Méfiance : Piège classique où les parieurs récréatifs suivent un récit contredit par les capitaux informés sur les marchés dérivés." 
            : "Les flux professionnels accumulent de manière concordante sur tous les compartiments de marché.",
          strategicConclusion: signal.category === 'CONVERGENCE_OVER'
            ? "Match ouvert idéal pour l'Over 1.5 ou Over 2.5."
            : signal.category === 'CONVERGENCE_UNDER'
            ? "Match verrouillé idéal pour Under 2.5 ou Under 3.5."
            : "Prudence ou couverture recommandée."
        }
      });
    }

    const prompt = `Tu es le meilleur analyste quantitatif et trader de paris sportifs Betfair Exchange.
Analyse la synthèse des flux multi-marchés suivante pour ce match de football :

Match : ${signal.home} vs ${signal.away}
Ligue : ${signal.league} (${signal.country})
Date : ${signal.date_formatted}
Indice de Convergence : ${signal.convergence_score}%
Catégorie détectée : ${signal.category_label}
Volume cumulé échangé : £${signal.total_volume_combined.toLocaleString()}

Marchés Constituants RÉELLEMENT DÉTECTÉS :
${signal.markets_included.map((m: any) => `- [${m.market_label}] : Choix dominant "${m.dominant_outcome}" avec ${m.dominant_pct}% du volume (£${m.volume.toLocaleString()})`).join('\n')}

Scénario automatique calculé : ${signal.scenario_title}
Synthèse : ${signal.analysis_summary}
Option Value proposée : ${signal.value_play}
Option Sécurité proposée : ${signal.safety_play}

RÈGLE ABSOLUE ANTI-HALLUCINATION :
- Base ton analyse UNIQUEMENT sur les marchés listés ci-dessus sous "Marchés Constituants RÉELLEMENT DÉTECTÉS".
- N'invente AUCUN marché qui ne figure pas dans cette liste. En particulier, si le marché "Score Exact" n'est pas dans la liste, tu ne dois absolument PAS inventer ou mentionner de scores exacts (comme 2-1 ou 1-2). Si le marché "Les 2 équipes marquent" n'y est pas, ne parle pas de BTTS.

Fournis une analyse experte en JSON valide avec EXACTEMENT ces clés :
{
  "headline": "Titre percutant basé sur les flux réels observés",
  "marketSynthesis": "Explication factuelle et précise des marchés réels listés ci-dessus (pourquoi ils convergent ou divergent)",
  "recommendedPlay": "Le meilleur pari à valeur ajoutée (Value)",
  "safetyNet": "L'option de sécurité maximale pour le parieur prudent (ex: +1.5 buts au lieu de +2.5, ou Double Chance)",
  "sharpVsPublic": "Qui mène la danse ? Les sharp traders informés ou le public crédule ?",
  "strategicConclusion": "Verdict opérationnel sans détour"
}
Réponds UNIQUEMENT avec le JSON pur.`;

    const responseContent = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const parsedAi = JSON.parse(responseContent.text || '{}');
    return res.json({
      success: true,
      source: 'gemini-3.8-flash',
      analysis: parsedAi,
    });
  } catch (error: any) {
    console.error('Error analyzing cross-market signal with AI:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 7. FREE RESULTS & LIVE SCORES API (ESPN)
// ==========================================
interface ResultsCacheEntry {
  timestamp: number;
  data: EspnMatchResult[];
}
const resultsCache: Record<string, ResultsCacheEntry> = {};
const RESULTS_CACHE_TTL_MS = 35000; // 35s
const inFlightScoreboards: Map<string, Promise<EspnMatchResult[]>> = new Map();

async function fetchScoreboardForLeague(leagueSlug: string, dateStr?: string): Promise<EspnMatchResult[]> {
  const cacheKey = `${leagueSlug}_${dateStr || 'current'}`;
  const now = Date.now();
  if (resultsCache[cacheKey] && (now - resultsCache[cacheKey].timestamp) < RESULTS_CACHE_TTL_MS) {
    return resultsCache[cacheKey].data;
  }

  if (inFlightScoreboards.has(cacheKey)) {
    return inFlightScoreboards.get(cacheKey)!;
  }

  const leagueDef = SUPPORTED_LEAGUES.find(l => l.slug === leagueSlug) || { name: leagueSlug };
  const dateParam = dateStr ? `?dates=${dateStr}` : '';
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/scoreboard${dateParam}`;

  const fetchPromise = (async () => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(4500),
      });
      if (!res.ok) return [];
      const json = await res.json();
      const events = Array.isArray(json.events) ? json.events : [];
      const parsed = events
        .map((ev: any) => parseEspnEvent(ev, leagueSlug, leagueDef.name))
        .filter((ev: EspnMatchResult | null): ev is EspnMatchResult => ev !== null);

      resultsCache[cacheKey] = {
        timestamp: Date.now(),
        data: parsed,
      };
      return parsed;
    } catch (err) {
      console.warn(`Could not fetch scoreboard for league ${leagueSlug}:`, err);
      return [];
    } finally {
      inFlightScoreboards.delete(cacheKey);
    }
  })();

  inFlightScoreboards.set(cacheKey, fetchPromise);
  return fetchPromise;
}

// 7.1 Get list of supported leagues
app.get('/api/results/leagues', (_req: Request, res: Response) => {
  res.json({
    success: true,
    leagues: SUPPORTED_LEAGUES,
  });
});

// 7.2 Get live scores & finished matches
app.get('/api/results/scoreboard', async (req: Request, res: Response) => {
  try {
    const league = (req.query.league as string) || 'all';
    const date = (req.query.date as string) || ''; // format YYYYMMDD
    const statusFilter = (req.query.status as string) || 'all'; // 'all' | 'live' | 'finished' | 'scheduled'

    let matches: EspnMatchResult[] = [];

    if (league === 'all') {
      // Fetch top 12 prominent leagues concurrently
      const topLeagues = [
        'uefa.nations',
        'uefa.champions',
        'uefa.europa',
        'eng.1',
        'eng.2',
        'eng.3',
        'eng.trophy',
        'esp.1',
        'esp.2',
        'ita.1',
        'ger.1',
        'fra.1'
      ];
      const resultsArray = await Promise.all(
        topLeagues.map(l => fetchScoreboardForLeague(l, date))
      );
      matches = resultsArray.flat();
    } else {
      matches = await fetchScoreboardForLeague(league, date);
    }

    // Apply status filter if provided
    if (statusFilter === 'live') {
      matches = matches.filter(m => m.status_state === 'IN_PROGRESS');
    } else if (statusFilter === 'finished') {
      matches = matches.filter(m => m.status_state === 'FINISHED' || m.completed);
    } else if (statusFilter === 'scheduled') {
      matches = matches.filter(m => m.status_state === 'SCHEDULED');
    }

    // Sort: Live first, then Scheduled by date, then Finished
    matches.sort((a, b) => {
      const stateOrder: Record<string, number> = {
        'IN_PROGRESS': 1,
        'SCHEDULED': 2,
        'FINISHED': 3,
        'POSTPONED': 4,
        'CANCELLED': 5,
      };
      const orderA = stateOrder[a.status_state] || 99;
      const orderB = stateOrder[b.status_state] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    res.json({
      success: true,
      count: matches.length,
      league,
      date: date || 'current',
      matches,
    });
  } catch (error: any) {
    console.error('Error fetching scoreboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7.3 Search & verify a specific match
app.get('/api/results/match', async (req: Request, res: Response) => {
  try {
    const home = (req.query.home as string) || '';
    const away = (req.query.away as string) || '';
    const date = (req.query.date as string) || '';

    if (!home || !away) {
      return res.status(400).json({ success: false, error: 'Équipes manquantes (home et away).' });
    }

    // Fetch across leagues
    const topLeagues = ['uefa.nations', 'eng.1', 'eng.2', 'eng.3', 'eng.trophy', 'esp.1', 'esp.2', 'ita.1', 'ger.1', 'fra.1', 'conmebol.libertadores', 'fifa.friendly'];
    const resultsArray = await Promise.all(
      topLeagues.map(l => fetchScoreboardForLeague(l, date))
    );
    const allMatches = resultsArray.flat();

    const matched = findMatchingEspnEvent(home, away, allMatches);
    res.json({
      success: true,
      found: !!matched,
      match: matched,
    });
  } catch (error: any) {
    console.error('Error finding match result:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7.4 Verify all current cross-market signals against real scores
app.get('/api/results/verify-signals', async (req: Request, res: Response) => {
  try {
    // 1. Get current cross-market signals
    const allMatchesMap: Record<string, ScrapedMatch[]> = {};
    await Promise.all(
      FOOTBALL_MARKETS.map(async (mDef) => {
        try {
          const resData = await scrapeArbworldMarket(mDef.key, false);
          allMatchesMap[mDef.key] = resData.data;
        } catch {
          allMatchesMap[mDef.key] = [];
        }
      })
    );
    const signals = generateCrossMarketSignals(allMatchesMap);

    // 2. Fetch scoreboards for today and recent days across top leagues
    const topLeagues = [
      'uefa.nations', 'uefa.champions', 'uefa.europa', 
      'eng.1', 'eng.2', 'eng.3', 'eng.trophy', 'eng.fa',
      'esp.1', 'esp.2', 'esp.copa_del_rey', 
      'ita.1', 'ger.1', 'fra.1', 'fifa.friendly'
    ];

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, '');

    const [eventsToday, eventsYesterday] = await Promise.all([
      Promise.all(topLeagues.map(l => fetchScoreboardForLeague(l, ''))).then(arr => arr.flat()),
      Promise.all(topLeagues.map(l => fetchScoreboardForLeague(l, yesterday))).then(arr => arr.flat()),
    ]);

    const allEvents = [...eventsToday, ...eventsYesterday];

    // 3. Correlate and evaluate each signal
    let matchedCount = 0;
    let finishedCount = 0;
    let valueWonCount = 0;
    let valueLostCount = 0;
    let safetyWonCount = 0;
    let safetyLostCount = 0;

    const verifications: SignalVerification[] = signals.map(sig => {
      const matchedEvent = findMatchingEspnEvent(sig.home, sig.away, allEvents);
      if (matchedEvent) {
        matchedCount++;
        if (matchedEvent.completed || matchedEvent.status_state === 'FINISHED') {
          finishedCount++;
        }
      }

      const valueVerif = verifySelectionAgainstResult(sig.value_play, matchedEvent || undefined);
      const safetyVerif = verifySelectionAgainstResult(sig.safety_play, matchedEvent || undefined);

      if (valueVerif.outcome === 'WON') valueWonCount++;
      if (valueVerif.outcome === 'LOST') valueLostCount++;
      if (safetyVerif.outcome === 'WON') safetyWonCount++;
      if (safetyVerif.outcome === 'LOST') safetyLostCount++;

      return {
        signal_id: sig.id,
        home: sig.home,
        away: sig.away,
        matched: !!matchedEvent,
        match_result: matchedEvent || undefined,
        value_play: sig.value_play,
        value_play_outcome: valueVerif.outcome,
        value_play_explanation: valueVerif.explanation,
        safety_play: sig.safety_play,
        safety_play_outcome: safetyVerif.outcome,
        safety_play_explanation: safetyVerif.explanation,
      };
    });

    const totalDecided = valueWonCount + valueLostCount;
    const valueWinRate = totalDecided > 0 ? Math.round((valueWonCount / totalDecided) * 100) : 0;
    const totalSafetyDecided = safetyWonCount + safetyLostCount;
    const safetyWinRate = totalSafetyDecided > 0 ? Math.round((safetyWonCount / totalSafetyDecided) * 100) : 0;

    res.json({
      success: true,
      stats: {
        total_signals: signals.length,
        matched_in_scoreboard: matchedCount,
        finished_matches: finishedCount,
        value_play: {
          won: valueWonCount,
          lost: valueLostCount,
          win_rate_pct: valueWinRate,
        },
        safety_play: {
          won: safetyWonCount,
          lost: safetyLostCount,
          win_rate_pct: safetyWinRate,
        },
      },
      verifications,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error verifying signals:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Setup Vite or static serving
async function setupVite() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MoneyWay Scraper & Multi-Market Analytics Server running on port ${PORT}`);
  });
}

setupVite().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
