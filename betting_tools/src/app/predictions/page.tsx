"use client"

import React, { useState } from "react";

type ParsedGame = {
  home: string;
  away: string;
  predictedSpread?: number; // negative means home favored
  predictedTotal?: number;
  predictedHomeWinProb?: number;
  source: string;
};

type AnalysisResult = {
  home: string;
  away: string;
  predictedSpread?: number;
  originalSpread?: number; // Original spread format: positive = away wins, negative = home wins
  marketSpread?: number;
  spreadDiff?: number;
  predictedTotal?: number;
  marketTotal?: number;
  totalDiff?: number;
  alert: boolean;
  spreadAlert?: boolean;
  totalAlert?: boolean;
  source?: string;
  gameTime?: string;
  projectedWinner?: string;
};

export default function PredictionsPage() {
  const [useKenpom, setUseKenpom] = useState(true);
  const [useTorvik, setUseTorvik] = useState(true);
  const [sidelineFile, setSidelineFile] = useState<File | null>(null);
  const [predictions, setPredictions] = useState<ParsedGame[]>([]);
  const [gameDate, setGameDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPredictions, setFetchingPredictions] = useState(false);
  
  // Source filters for results display
  const [showKenpom, setShowKenpom] = useState(true);
  const [showTorvik, setShowTorvik] = useState(true);
  const [showSideline, setShowSideline] = useState(true);
  
  // Bet type filters
  const [showSpread, setShowSpread] = useState(true);
  const [showTotal, setShowTotal] = useState(true);
  
  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  function parseSidelineRow(r: Record<string, unknown>, nextRow: Record<string, unknown>): ParsedGame | null {
    if (!nextRow) return null;
    
    const team1 = String(r.Team ?? "").trim();
    const team2 = String(nextRow.Team ?? "").trim();
    
    console.log('Parsing Sideline row:', { team1, team2, row1: r, row2: nextRow });
    
    if (!team1 || !team2) {
      console.log('Skipping - missing team names');
      return null;
    }
    
    // Sideline format: First row = away team, Second row = home team
    const away = team1;
    const home = team2;
    const awayScore = Number(r.Score ?? 0);
    const homeScore = Number(nextRow.Score ?? 0);
    
    console.log('Scores:', { away, awayScore, home, homeScore });
    
    // Calculate spread and total from predicted scores
    // predictedSpread = awayScore - homeScore (positive = away wins, negative = home wins)
    const predictedSpread = awayScore - homeScore;
    const predictedTotal = awayScore + homeScore;
    
    console.log('Result:', { predictedSpread, predictedTotal });
    
    return {
      home,
      away,
      predictedSpread,
      predictedTotal,
      source: "Sideline"
    };
  }

  async function parseSidelineCsv(file: File): Promise<ParsedGame[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const Papa = (await import("papaparse")).default;
          
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (res: { data: Record<string, unknown>[] }) => {
              const rows = res.data;
              const games: ParsedGame[] = [];
              
              if (rows[0]?.Team) {
                for (let i = 0; i < rows.length; i += 2) {
                  const game = parseSidelineRow(rows[i], rows[i + 1]);
                  if (game) games.push(game);
                }
              }
              
              resolve(games);
            },
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async function fetchAllPredictions() {
    setFetchingPredictions(true);
    const allPredictions: ParsedGame[] = [];
    
    try {
      // Fetch KenPom if selected
      if (useKenpom) {
        try {
          const resp = await fetch('/api/kenpom', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameDate }),
          });
          const json = await resp.json();
          if (json.ok) {
            allPredictions.push(...(json.predictions || []));
          } else {
            console.error('KenPom error:', json.error);
          }
        } catch (err) {
          console.error('KenPom fetch failed:', err);
        }
      }

      // Fetch Bart Torvik if selected
      if (useTorvik) {
        try {
          const resp = await fetch('/api/torvik', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameDate }),
          });
          const json = await resp.json();
          if (json.ok) {
            allPredictions.push(...(json.predictions || []));
          } else {
            console.error('Torvik error:', json.error);
          }
        } catch (err) {
          console.error('Torvik fetch failed:', err);
        }
      }

      // Parse Sideline CSV if uploaded
      if (sidelineFile) {
        try {
          const sidelinePredictions = await parseSidelineCsv(sidelineFile);
          allPredictions.push(...sidelinePredictions);
        } catch (err) {
          console.error('Sideline parse failed:', err);
        }
      }

      setPredictions(allPredictions);
      
      if (allPredictions.length === 0) {
        alert('No predictions fetched. Check console for errors.');
      }
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setFetchingPredictions(false);
    }
  }

  async function runAnalysis() {
    setLoading(true);
    try {
      const resp = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictions, gameDate }),
      });
      const json = await resp.json();
      const sortedResults = (json.results || []).sort((a: AnalysisResult, b: AnalysisResult) => {
        // Sort by game time first, then by game (away/home), then source
        const timeA = a.gameTime ? new Date(a.gameTime).getTime() : 0;
        const timeB = b.gameTime ? new Date(b.gameTime).getTime() : 0;
        const timeCompare = timeA - timeB;
        if (timeCompare !== 0) return timeCompare;
        
        const awayCompare = a.away.localeCompare(b.away);
        if (awayCompare !== 0) return awayCompare;
        const homeCompare = a.home.localeCompare(b.home);
        if (homeCompare !== 0) return homeCompare;
        return (a.source || '').localeCompare(b.source || '');
      });
      setResults(sortedResults);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Prediction Analysis</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">Compare multiple prediction sources against sportsbook odds</p>
        </div>

        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-3">Prediction Sources</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useKenpom}
                  onChange={(e) => setUseKenpom(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">KenPom API (requires API key)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useTorvik}
                  onChange={(e) => setUseTorvik(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Bart Torvik (free, no API key)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Sideline CSV (optional)</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setSidelineFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
            />
            {sidelineFile && <p className="text-xs text-green-600 mt-1">✓ {sidelineFile.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Game Date</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-1 rounded border px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
              />
              <button
                className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium whitespace-nowrap disabled:opacity-50"
                onClick={fetchAllPredictions}
                disabled={fetchingPredictions || (!useKenpom && !useTorvik && !sidelineFile)}
              >
                {fetchingPredictions ? 'Fetching...' : 'Fetch All Predictions'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {!useKenpom && !useTorvik && !sidelineFile 
                ? 'Select at least one source' 
                : 'Fetch predictions from all selected sources'}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <button 
            className="w-full lg:w-auto px-6 py-3 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={runAnalysis} 
            disabled={loading || predictions.length === 0}
          >
            {loading ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            Parsed Predictions 
            <span className="text-sm text-slate-400 ml-2">
              ({predictions.length} games from {[
                useKenpom && predictions.some(p => p.source.includes('KenPom')) && 'KenPom',
                useTorvik && predictions.some(p => p.source.includes('Torvik')) && 'Torvik',
                sidelineFile && predictions.some(p => p.source === 'Sideline') && 'Sideline'
              ].filter(Boolean).join(', ') || 'no sources'})
            </span>
          </h3>
          {predictions.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8 border-2 border-dashed rounded">
              No predictions fetched yet. Select sources and click &quot;Fetch All Predictions&quot; above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-auto">
              {predictions.map((p, i) => (
                <div key={i} className="p-3 rounded border bg-slate-50 dark:bg-slate-700 text-sm">
                  <div className="font-semibold">{p.away} <span className="text-slate-400">@</span> {p.home}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {p.predictedSpread !== undefined && <span>Spread: {p.predictedSpread > 0 ? '+' : ''}{p.predictedSpread.toFixed(1)} • </span>}
                    {p.predictedTotal !== undefined && <span>Total: {p.predictedTotal.toFixed(1)} • </span>}
                    <span className="text-slate-400">{p.source}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Analysis Results</h3>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-4">
                <span className="text-slate-500">Source:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showKenpom}
                    onChange={(e) => setShowKenpom(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span>KenPom</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTorvik}
                    onChange={(e) => setShowTorvik(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span>Bart Torvik</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSideline}
                    onChange={(e) => setShowSideline(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span>Sideline</span>
                </label>
              </div>
              <div className="flex items-center gap-4 border-l pl-6">
                <span className="text-slate-500">Bet Type:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSpread}
                    onChange={(e) => setShowSpread(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span>Spread</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTotal}
                    onChange={(e) => setShowTotal(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span>Total</span>
                </label>
              </div>
            </div>
            <div className="mt-3">
              <input
                type="text"
                placeholder="Search by team name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-md px-4 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-600"
              />
            </div>
          </div>
          <div className="max-h-[calc(100vh-300px)] overflow-auto border rounded">
            <table className="min-w-full divide-y">
              <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium bg-slate-100 dark:bg-slate-700">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium bg-slate-100 dark:bg-slate-700">Away</th>
                  <th className="px-4 py-3 text-left text-sm font-medium bg-slate-100 dark:bg-slate-700">Home</th>
                  <th className="px-4 py-3 text-left text-sm font-medium bg-slate-100 dark:bg-slate-700">Source</th>
                  <th className="px-4 py-3 text-left text-sm font-medium bg-slate-100 dark:bg-slate-700">Bet Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium bg-slate-100 dark:bg-slate-700">Projected Winner</th>
                  <th className="px-4 py-3 text-center text-sm font-medium bg-slate-100 dark:bg-slate-700">Predicted Score</th>
                  <th className="px-4 py-3 text-right text-sm font-medium bg-slate-100 dark:bg-slate-700">Prediction</th>
                  <th className="px-4 py-3 text-right text-sm font-medium bg-slate-100 dark:bg-slate-700">Market</th>
                  <th className="px-4 py-3 text-right text-sm font-medium bg-slate-100 dark:bg-slate-700">Diff</th>
                  <th className="px-4 py-3 text-center text-sm font-medium bg-slate-100 dark:bg-slate-700">Alert</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y">
                {results.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-slate-400">No results yet — click &quot;Run Analysis&quot;</td>
                  </tr>
                )}
                {results
                  .filter((r) => {
                    if (r.source?.includes('KenPom')) return showKenpom;
                    if (r.source?.includes('Torvik')) return showTorvik;
                    if (r.source === 'Sideline') return showSideline;
                    return true;
                  })
                  .filter((r) => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    return r.away.toLowerCase().includes(search) || 
                           r.home.toLowerCase().includes(search);
                  })
                  .flatMap((r: AnalysisResult, idx: number, filteredArray: AnalysisResult[]) => {
                    const gameTime = r.gameTime ? new Date(r.gameTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—';
                    const rows = [];
                    
                    // Check if this is the first row of a new game
                    const isNewGame = idx === 0 || 
                      filteredArray[idx - 1].away !== r.away || 
                      filteredArray[idx - 1].home !== r.home;
                    
                    const gameBorderClass = isNewGame ? 'border-t-4 border-t-indigo-600 dark:border-t-indigo-400' : '';
                    
                    // Spread row
                    if (showSpread && (r.predictedSpread !== undefined || r.marketSpread !== null)) {
                      // Use spreadAlert from backend
                      const spreadAlert = r.spreadAlert || false;
                      
                      // Calculate predicted score from spread and total
                      // originalSpread format: positive = away wins, negative = home wins
                      let predictedScore = "—";
                      if (r.originalSpread !== undefined && r.predictedTotal !== undefined) {
                        // For positive spread (away wins): awayScore > homeScore
                        // For negative spread (home wins): homeScore > awayScore
                        // Formula: awayScore = (total + originalSpread) / 2, homeScore = (total - originalSpread) / 2
                        const awayScore = Math.round((r.predictedTotal + r.originalSpread) / 2);
                        const homeScore = Math.round((r.predictedTotal - r.originalSpread) / 2);
                        predictedScore = `${awayScore}-${homeScore}`;
                      }
                      
                      rows.push(
                        <tr key={`${idx}-spread`} className={`${spreadAlert ? "bg-amber-50 dark:bg-amber-900/20" : ""} ${gameBorderClass}`}>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">{gameTime}</td>
                          <td className="px-4 py-3 text-sm">{r.away}</td>
                          <td className="px-4 py-3 text-sm font-medium">{r.home}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-block px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700">
                              {r.source}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-block px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              Spread
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold">{r.projectedWinner ?? "—"}</td>
                          <td className="px-4 py-3 text-center font-mono text-sm font-semibold">{predictedScore}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">{r.predictedSpread?.toFixed(1) ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">{r.marketSpread?.toFixed(1) ?? "—"}</td>
                          <td className={`px-4 py-3 text-right font-mono text-sm ${Math.abs(r.spreadDiff || 0) >= 4 ? 'font-bold text-red-600' : ''}`}>
                            {r.spreadDiff?.toFixed(1) ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {spreadAlert && <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">⚠️</span>}
                          </td>
                        </tr>
                      );
                    }
                    
                    // Total row
                    if (showTotal && (r.predictedTotal !== undefined || r.marketTotal !== null)) {
                      const totalAlert = r.totalAlert || false;
                      rows.push(
                        <tr key={`${idx}-total`} className={totalAlert ? "bg-amber-50 dark:bg-amber-900/20" : ""}>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">{gameTime}</td>
                          <td className="px-4 py-3 text-sm">{r.away}</td>
                          <td className="px-4 py-3 text-sm font-medium">{r.home}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-block px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700">
                              {r.source}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-block px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                              Total
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">—</td>
                          <td className="px-4 py-3 text-center">—</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">{r.predictedTotal?.toFixed(1) ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">{r.marketTotal?.toFixed(1) ?? "—"}</td>
                          <td className={`px-4 py-3 text-right font-mono text-sm ${Math.abs(r.totalDiff || 0) >= 4 ? 'font-bold text-red-600' : ''}`}>
                            {r.totalDiff?.toFixed(1) ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {totalAlert && <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">⚠️</span>}
                          </td>
                        </tr>
                      );
                    }
                    
                    return rows;
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
