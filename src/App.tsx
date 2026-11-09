/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { WaltHeader } from './components/WaltHeader';
import { WaltBalanceHero } from './components/WaltBalanceHero';
import { WaltActionGrid } from './components/WaltActionGrid';
import { WaltPromoBanner } from './components/WaltPromoBanner';
import { WaltTopMarkets } from './components/WaltTopMarkets';
import { WaltMarketHeatmap } from './components/WaltMarketHeatmap';
import { WaltMatchList } from './components/WaltMatchList';
import { WaltFloatingNav, WaltTab } from './components/WaltFloatingNav';
import { MarketDrawerModal } from './components/MarketDrawerModal';
import { MatchDetailModal } from './components/MatchDetailModal';
import { SignalsIntelligenceView } from './components/SignalsIntelligenceView';
import { ResultsVerificationView } from './components/ResultsVerificationView';
import { FilterView } from './components/NavigationRail';
import { ScrapedMatch, ApiResponse, MarketKey, CrossMarketSignal } from './types';
import { MARKET_FALLBACKS } from './data/marketFallbacks';
import { parseAndEnrichMatches } from './utils/enrichMatches';
import { FOOTBALL_MARKETS, getMarketDef } from './data/markets';
import { generateCrossMarketSignals } from './utils/signalsEngine';
import { WifiOff, Search } from 'lucide-react';

export default function App() {
  // Navigation active tab: 'feed' (Walt) | 'heatmap' (Trade) | 'signals' (Signaux IA) | 'results' (Scores)
  const [activeTab, setActiveTab] = useState<WaltTab>('feed');
  const [currentFilter, setCurrentFilter] = useState<FilterView>('all');
  const [selectedMarket, setSelectedMarket] = useState<MarketKey>('1x2');
  const [isMarketDrawerOpen, setIsMarketDrawerOpen] = useState(false);

  // Client-side cache for instantaneous market tab switching (0ms delay)
  const clientMarketCache = useRef<Record<string, { data: ScrapedMatch[]; timestamp: number; volume: number }>>({});

  // Summary counts and volumes per market
  const [marketSummaries, setMarketSummaries] = useState<Record<string, { count: number; volume: number }>>(() => {
    const initial: Record<string, { count: number; volume: number }> = {};
    FOOTBALL_MARKETS.forEach(m => {
      const fb = MARKET_FALLBACKS[m.key];
      initial[m.key] = {
        count: Array.isArray(fb) ? fb.length : 0,
        volume: 0,
      };
    });
    return initial;
  });

  // Cross-Market Synthesized Signals (Convergence & Divergence Matrix)
  const [signals, setSignals] = useState<CrossMarketSignal[]>(() => {
    try {
      const map: Record<string, ScrapedMatch[]> = {};
      FOOTBALL_MARKETS.forEach(m => {
        if (MARKET_FALLBACKS[m.key] && Array.isArray(MARKET_FALLBACKS[m.key])) {
          map[m.key] = parseAndEnrichMatches(MARKET_FALLBACKS[m.key], m.key);
        }
      });
      return generateCrossMarketSignals(map);
    } catch (e) {
      console.warn('Error initializing fallback signals:', e);
      return [];
    }
  });

  // Initialize matches with fallback data for selected market
  const [matches, setMatches] = useState<ScrapedMatch[]>(() => {
    try {
      if (MARKET_FALLBACKS['1x2'] && Array.isArray(MARKET_FALLBACKS['1x2'])) {
        const parsed = parseAndEnrichMatches(MARKET_FALLBACKS['1x2'], '1x2');
        clientMarketCache.current['1x2'] = {
          data: parsed,
          timestamp: Date.now(),
          volume: parsed.reduce((s, m) => s + m.total_volume, 0)
        };
        return parsed;
      }
    } catch (e) {
      console.warn('Fallback init error:', e);
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(() => {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  });

  const [selectedMatch, setSelectedMatch] = useState<ScrapedMatch | null>(() => matches[0] || null);
  const [detailModalMatch, setDetailModalMatch] = useState<ScrapedMatch | null>(null);

  // Auto-Refresh state
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('moneyway_autorefresh');
      return saved !== null ? Number(saved) : 45;
    } catch {
      return 45;
    }
  });
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(autoRefreshInterval);

  const handleSetAutoRefreshInterval = (sec: number) => {
    setAutoRefreshInterval(sec);
    setSecondsUntilRefresh(sec);
    try {
      localStorage.setItem('moneyway_autorefresh', String(sec));
    } catch {}
  };

  // Fetch market summaries to show counts & volumes
  const fetchSummaries = useCallback(async () => {
    try {
      const res = await fetch('/api/moneyway/summary');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.summaries)) {
          const map: Record<string, { count: number; volume: number }> = {};
          json.summaries.forEach((s: any) => {
            map[s.key] = { count: s.match_count, volume: s.total_volume };
          });
          setMarketSummaries(map);
        }
      }
    } catch (e) {
      console.warn('Could not fetch market summaries:', e);
    }
  }, []);

  // Fetch Cross-Market Synthesized Signals Matrix
  const fetchSignals = useCallback(async (force = false) => {
    try {
      const res = await fetch(`/api/moneyway/signals/matrix?force=${force}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.signals)) {
          setSignals(json.signals);
        }
      }
    } catch (e) {
      console.warn('Could not fetch signals matrix:', e);
    }
  }, []);

  // Fetch Data Function with Client Caching & Fast Stale-While-Revalidate
  const fetchData = useCallback(async (market: MarketKey, force = false) => {
    const cached = clientMarketCache.current[market];
    const now = Date.now();
    const hasFreshCache = cached && (now - cached.timestamp < 35000) && !force;

    if (!hasFreshCache) {
      if (!cached || cached.data.length === 0) {
        setIsLoading(true);
      }
    }

    setError(null);
    try {
      const endpoint = `/api/moneyway/football/${market}?force=${force}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7500);

      const res = await fetch(endpoint, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Erreur serveur HTTP ${res.status}`);
      }

      const json: ApiResponse = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        throw new Error(json.error || 'Format de données inattendu');
      }

      // Store in client cache
      clientMarketCache.current[market] = {
        data: json.data,
        timestamp: Date.now(),
        volume: json.meta?.total_volume_slate || 0,
      };

      setMatches(json.data);
      if (json.data.length > 0) {
        setSelectedMatch(prev => {
          if (!prev) return json.data[0];
          const found = json.data.find(m => m.id === prev.id);
          return found || json.data[0];
        });
      } else {
        setSelectedMatch(null);
      }
      const nowDate = new Date();
      setLastUpdated(nowDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));

      // Also update this market in summaries
      setMarketSummaries(prev => ({
        ...prev,
        [market]: {
          count: json.data.length,
          volume: json.meta?.total_volume_slate || 0,
        }
      }));
    } catch (err: any) {
      console.warn(`Fetch error for ${market}:`, err);
      if (cached && cached.data.length > 0) {
        setMatches(cached.data);
      } else if (MARKET_FALLBACKS[market] && Array.isArray(MARKET_FALLBACKS[market])) {
        const fallbackParsed = parseAndEnrichMatches(MARKET_FALLBACKS[market], market);
        setMatches(fallbackParsed);
        if (fallbackParsed.length > 0) {
          setSelectedMatch(fallbackParsed[0]);
        }
      }
      setError(`Mode données locales synchronisé (${err.name === 'AbortError' ? 'délai réseau' : err.message}).`);
    } finally {
      setIsLoading(false);
      setSecondsUntilRefresh(autoRefreshInterval);
    }
  }, [autoRefreshInterval]);

  // Handle switching market with instantaneous cache display
  const handleMarketChange = (newMarket: MarketKey) => {
    setSelectedMarket(newMarket);
    setCurrentFilter('all');

    // Instantaneous UI update from cache if present
    const cached = clientMarketCache.current[newMarket];
    if (cached && cached.data.length > 0) {
      setMatches(cached.data);
      setSelectedMatch(cached.data[0]);
    }

    // Then revalidate in background
    fetchData(newMarket, false);
  };

  // Fetch initial market on load
  useEffect(() => {
    fetchData(selectedMarket);
  }, [selectedMarket, fetchData]);

  // Initial summaries & signals fetch
  useEffect(() => {
    fetchSummaries();
    fetchSignals();
  }, [fetchSummaries, fetchSignals]);

  // Auto-refresh countdown loop
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const timer = setInterval(() => {
      if (detailModalMatch !== null || isMarketDrawerOpen || document.hidden) {
        return;
      }

      setSecondsUntilRefresh(prev => {
        if (prev <= 1) {
          fetchData(selectedMarket, false);
          fetchSummaries();
          fetchSignals(false);
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshInterval, detailModalMatch, isMarketDrawerOpen, selectedMarket, fetchData, fetchSummaries, fetchSignals]);

  // Filtered matches based on current action buttons (all, whales, drops)
  const filteredMatches = useMemo(() => {
    if (currentFilter === 'whales') {
      return matches.filter(m => m.liquidity_tier === 'WHALE' || m.total_volume >= 20000);
    }
    if (currentFilter === 'drops') {
      return matches.filter(m => m.drop_1_pct <= -6 || m.drop_2_pct <= -6 || m.drop_x_pct <= -6);
    }
    return matches;
  }, [matches, currentFilter]);

  // Counts for action grid buttons
  const whaleCount = useMemo(() => {
    return matches.filter(m => m.liquidity_tier === 'WHALE' || m.total_volume >= 20000).length;
  }, [matches]);

  const dropCount = useMemo(() => {
    return matches.filter(m => m.drop_1_pct <= -6 || m.drop_2_pct <= -6 || m.drop_x_pct <= -6).length;
  }, [matches]);

  // Total volume for active market
  const activeTotalVolume = useMemo(() => {
    return matches.reduce((sum, m) => sum + m.total_volume, 0);
  }, [matches]);

  const marketDef = getMarketDef(selectedMarket);

  const isWideTab = activeTab === 'heatmap' || activeTab === 'signals' || activeTab === 'results';

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-800 font-sans antialiased flex flex-col items-center justify-start pb-24 selection:bg-sky-200">
      
      {/* Container wrapper: Full screen width (max-w-[1480px]) for Trade, Signals and Scores; native max-w-xl for Feed */}
      <div className={`w-full min-h-screen flex flex-col bg-[#F0F2F5] transition-all duration-200 ${
        isWideTab ? 'max-w-[1480px] mx-auto px-2 sm:px-4 lg:px-6' : 'max-w-xl mx-auto'
      }`}>

        {/* 1. Telegram Walt Header */}
        <WaltHeader
          selectedMarket={selectedMarket}
          onSelectMarket={handleMarketChange}
          onRefresh={() => {
            fetchData(selectedMarket, true);
            fetchSummaries();
            fetchSignals(true);
          }}
          isLoading={isLoading}
          autoRefreshInterval={autoRefreshInterval}
          onSetAutoRefreshInterval={handleSetAutoRefreshInterval}
          secondsUntilRefresh={secondsUntilRefresh}
          onOpenMarketDrawer={() => setIsMarketDrawerOpen(true)}
          onResetView={() => {
            setActiveTab('feed');
            setCurrentFilter('all');
          }}
        />

        {/* Sync Offline / Timeout Alert Notice */}
        {error && (
          <div className="mx-4 mt-2 bg-amber-50 border border-amber-200/80 rounded-2xl px-4 py-2 flex items-center justify-between text-xs text-amber-800 shadow-xs">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => {
                fetchData(selectedMarket, true);
                fetchSignals(true);
              }}
              className="font-bold underline text-amber-900 hover:text-amber-700 ml-2 cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Main Content Body */}
        <main className="flex-1 px-3 sm:px-4 pt-2">
          
          {/* TAB 1: Walt / Feed View (Matches Screenshot 1) */}
          {activeTab === 'feed' && (
            <div className="animate-in fade-in duration-150">
              
              {/* Balance Hero: "Volume Total • 1X2 Résultat £144,905" */}
              <WaltBalanceHero
                totalVolume={activeTotalVolume}
                matchCount={matches.length}
                marketLabel={marketDef.label}
              />

              {/* 4 White Squircle Action Buttons: Marchés, Whales, Chutes, Signaux IA */}
              <WaltActionGrid
                currentView={currentFilter}
                onViewChange={(view) => {
                  if (view === 'signals') {
                    setActiveTab('signals');
                  } else {
                    setCurrentFilter(view);
                  }
                }}
                onOpenMarketDrawer={() => setIsMarketDrawerOpen(true)}
                whaleCount={whaleCount}
                dropCount={dropCount}
              />

              {/* Cyan Sky-Blue Promo Card Banner */}
              <WaltPromoBanner
                onLearnMore={() => setActiveTab('signals')}
              />

              {/* Top Markets Avatars row ("Marchés les plus suivis") */}
              <WaltTopMarkets
                selectedMarket={selectedMarket}
                onSelectMarket={handleMarketChange}
                onOpenMarketDrawer={() => setIsMarketDrawerOpen(true)}
              />

              {/* Live Match Assets List (Without profile avatar icons) */}
              <WaltMatchList
                matches={filteredMatches}
                selectedMarket={selectedMarket}
                onSelectMatch={(match) => {
                  setSelectedMatch(match);
                  setDetailModalMatch(match);
                }}
                onOpenAiModal={(match) => {
                  setSelectedMatch(match);
                  setDetailModalMatch(match);
                }}
                selectedMatchId={selectedMatch?.id}
                totalVolume={activeTotalVolume}
              />

            </div>
          )}

          {/* TAB 2: Trade / Heatmap View - Takes full screen width */}
          {activeTab === 'heatmap' && (
            <div className="animate-in fade-in duration-150 pt-2 w-full">
              
              {/* What people buy first row - full width */}
              <WaltTopMarkets
                selectedMarket={selectedMarket}
                onSelectMarket={handleMarketChange}
                onOpenMarketDrawer={() => setIsMarketDrawerOpen(true)}
              />

              {/* Responsive layout: 2-column on desktop (Heatmap + Matches side-by-side), stacked on mobile */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 w-full">
                
                {/* Heatmap takes 7 cols on desktop, full width on mobile */}
                <div className="lg:col-span-7 xl:col-span-7">
                  <WaltMarketHeatmap
                    matches={matches}
                    onSelectMatch={(match) => {
                      setSelectedMatch(match);
                      setDetailModalMatch(match);
                    }}
                  />
                </div>

                {/* Match List takes 5 cols on desktop, full width on mobile */}
                <div className="lg:col-span-5 xl:col-span-5">
                  <WaltMatchList
                    matches={filteredMatches}
                    selectedMarket={selectedMarket}
                    onSelectMatch={(match) => {
                      setSelectedMatch(match);
                      setDetailModalMatch(match);
                    }}
                    onOpenAiModal={(match) => {
                      setSelectedMatch(match);
                      setDetailModalMatch(match);
                    }}
                    selectedMatchId={selectedMatch?.id}
                    totalVolume={activeTotalVolume}
                  />
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: Signaux IA View - Takes full screen width */}
          {activeTab === 'signals' && (
            <div className="animate-in fade-in duration-150 pt-2 pb-6 w-full">
              <div className="bg-white rounded-3xl p-4 sm:p-6 lg:p-7 shadow-xs border border-slate-100 w-full">
                <SignalsIntelligenceView
                  signals={signals}
                  isLoading={isLoading}
                  onRefresh={() => {
                    fetchSignals(true);
                    fetchSummaries();
                  }}
                  lastUpdated={lastUpdated}
                  onSelectMatch={(match) => {
                    setSelectedMatch(match);
                    setDetailModalMatch(match);
                  }}
                  onOpenAiModal={(match) => {
                    setSelectedMatch(match);
                    setDetailModalMatch(match);
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 4: Scores & Résultat Verification View - Takes full screen width */}
          {activeTab === 'results' && (
            <div className="animate-in fade-in duration-150 pt-2 pb-6 w-full">
              <div className="bg-white rounded-3xl p-4 sm:p-6 lg:p-7 shadow-xs border border-slate-100 w-full">
                <ResultsVerificationView
                  onSelectMatchName={(home, away) => {
                    const found = matches.find(m => 
                      m.home.toLowerCase().includes(home.toLowerCase()) || 
                      m.away.toLowerCase().includes(away.toLowerCase())
                    );
                    if (found) {
                      setSelectedMatch(found);
                      setDetailModalMatch(found);
                    }
                  }}
                />
              </div>
            </div>
          )}

        </main>

        {/* Floating Capsule Bottom Nav matching Screenshot 1 & 2 */}
        <WaltFloatingNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          signalsCount={signals.filter(s => s.category === 'CONVERGENCE_OVER' || s.category === 'DIVERGENCE_WARNING').length}
        />

      </div>

      {/* Market Selector Drawer Sheet */}
      <MarketDrawerModal
        isOpen={isMarketDrawerOpen}
        onClose={() => setIsMarketDrawerOpen(false)}
        selectedMarket={selectedMarket}
        onSelectMarket={(mKey) => {
          handleMarketChange(mKey);
          setIsMarketDrawerOpen(false);
        }}
        marketSummaries={marketSummaries}
      />

      {/* Match Detail Modal */}
      {detailModalMatch && (
        <MatchDetailModal
          match={detailModalMatch}
          onClose={() => setDetailModalMatch(null)}
          onSelectMarket={(mKey) => {
            handleMarketChange(mKey);
            setDetailModalMatch(null);
          }}
        />
      )}

    </div>
  );
}
