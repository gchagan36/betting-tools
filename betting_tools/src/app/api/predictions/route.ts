import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCanonicalName, normalizeTeamName } from "./teamAliases";

const SECRETS_PATH = path.resolve(process.cwd(), ".secrets.json");

async function readApiKey(): Promise<string | null> {
  try {
    if (process.env.THE_ODDS_API_KEY) return process.env.THE_ODDS_API_KEY;
    if (process.env.API_KEY) return process.env.API_KEY;
    if (!fs.existsSync(SECRETS_PATH)) return null;
    const raw = fs.readFileSync(SECRETS_PATH, "utf8");
    const data = JSON.parse(raw);
    return data.theOddsApiKey ?? data.apiKey ?? null;
  } catch (err) {
    return null;
  }
}

type ParsedGame = {
  home: string;
  away: string;
  predictedSpread?: number;
  predictedTotal?: number;
  source: string;
};

type OddsOutcome = {
  name: string;
  price: number; // American odds
  point?: number; // Spread or total line
};

type OddsData = {
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: Array<{
    key: string;
    markets: Array<{
      key: string; // "spreads" or "totals"
      outcomes: OddsOutcome[];
    }>;
  }>;
};

async function fetchTheOddsAPI(gameDate: string, apiKey: string): Promise<OddsData[]> {
  try {
    // Convert date to UTC timestamp in the required format: YYYY-MM-DDTHH:MM:SSZ
    // Input gameDate is like "2026-02-01", we need to set it to start of day UTC
    const timestamp = `${gameDate}T00:00:00Z`;
    
    const url = `https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds?apiKey=${apiKey}&regions=us&oddsFormat=american&markets=spreads,totals&commenceTimeFrom=${timestamp}&sportsbook=fanduel,draftkings,betmgm,betrivers`;
    
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("TheOddsAPI error:", resp.status, await resp.text());
      return [];
    }
    
    return await resp.json();
  } catch (err) {
    console.error("TheOddsAPI fetch error:", err);
    return [];
  }
}

function findBestMatch(predGame: ParsedGame, oddsGames: OddsData[]): OddsData | null {
  const homeVariants = normalizeTeamName(predGame.home);
  const awayVariants = normalizeTeamName(predGame.away);
  
  // Try exact match with all name variants
  for (const game of oddsGames) {
    for (const homeVariant of homeVariants) {
      for (const awayVariant of awayVariants) {
        if (
          (game.home_team.toLowerCase().includes(homeVariant.toLowerCase()) ||
          homeVariant.toLowerCase().includes(game.home_team.toLowerCase())) &&
          (game.away_team.toLowerCase().includes(awayVariant.toLowerCase()) ||
          awayVariant.toLowerCase().includes(game.away_team.toLowerCase()))
        ) {
          return game;
        }
      }
    }
  }
  
  // Fuzzy match by team names
  for (const game of oddsGames) {
    const homeTokens = predGame.home.toLowerCase().split(/\s+/);
    const awayTokens = predGame.away.toLowerCase().split(/\s+/);
    const gameHomeTokens = game.home_team.toLowerCase().split(/\s+/);
    const gameAwayTokens = game.away_team.toLowerCase().split(/\s+/);
    
    const homeMatch = homeTokens.some(t => t.length > 2 && gameHomeTokens.includes(t)) || gameHomeTokens.some(t => t.length > 2 && homeTokens.includes(t));
    const awayMatch = awayTokens.some(t => t.length > 2 && gameAwayTokens.includes(t)) || gameAwayTokens.some(t => t.length > 2 && awayTokens.includes(t));
    
    if (homeMatch && awayMatch) {
      return game;
    }
  }
  
  console.log(`No match found for: ${predGame.away} @ ${predGame.home}`);
  return null;
}

function extractMarketLines(oddsGame: OddsData): { spread: number | null; total: number | null } {
  let spread: number | null = null;
  let total: number | null = null;
  
  // Use first available bookmaker
  if (oddsGame.bookmakers.length === 0) return { spread, total };
  
  const bookmaker = oddsGame.bookmakers[0];
  
  for (const market of bookmaker.markets) {
    if (market.key === "spreads") {
      // Find away team spread (negative = away favored)
      const awayOutcome = market.outcomes.find(o => o.name === oddsGame.away_team);
      if (awayOutcome && awayOutcome.point !== undefined) {
        spread = awayOutcome.point;
      }
    } else if (market.key === "totals") {
      // Total is usually listed as "Over" and "Under" with same point value
      const overOutcome = market.outcomes.find(o => o.name === "Over");
      if (overOutcome && overOutcome.point !== undefined) {
        total = overOutcome.point;
      }
    }
  }
  
  return { spread, total };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const predictions: ParsedGame[] = body.predictions || [];
    const gameDate: string = body.gameDate || new Date().toISOString().split('T')[0];
    const apiKey = await readApiKey();
    
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "API key not set" }, { status: 400 });
    }
    
    // Fetch odds from TheOddsAPI
    const oddsGames = await fetchTheOddsAPI(gameDate, apiKey);
    
    const results: any[] = [];
    
    for (const pred of predictions) {
      const oddsGame = findBestMatch(pred, oddsGames);
      let marketSpread: number | null = null;
      let marketTotal: number | null = null;
      
      if (oddsGame) {
        const lines = extractMarketLines(oddsGame);
        marketSpread = lines.spread;
        marketTotal = lines.total;
      }
      
      // Normalize both spreads to show favorite's line (always negative)
      let normalizedPredSpread = pred.predictedSpread;
      let normalizedMarketSpread = marketSpread;
      
      // Convert predicted spread to favorite's line (make negative if positive)
      if (normalizedPredSpread !== undefined && normalizedPredSpread > 0) {
        normalizedPredSpread = -normalizedPredSpread;
      }
      
      // Convert market spread to favorite's line (make negative if positive)
      if (normalizedMarketSpread !== null && normalizedMarketSpread > 0) {
        normalizedMarketSpread = -normalizedMarketSpread;
      }
      
      // Calculate differences using favorite's line magnitudes
      const spreadDiff = (normalizedPredSpread !== undefined && normalizedMarketSpread !== null)
        ? Math.abs(Math.abs(normalizedPredSpread) - Math.abs(normalizedMarketSpread))
        : null;
      
      const totalDiff = (pred.predictedTotal !== undefined && marketTotal !== null)
        ? Math.abs(pred.predictedTotal - marketTotal)
        : null;
      
      // Determine projected winner from original predicted spread
      let projectedWinner = "—";
      if (pred.predictedSpread !== undefined) {
        if (pred.predictedSpread < 0) {
          projectedWinner = pred.home;
        } else if (pred.predictedSpread > 0) {
          projectedWinner = pred.away;
        } else {
          projectedWinner = "Pick'em";
        }
      }
      
      // Alert logic:
      // 1. If prediction disagrees with sportsbook on winner → alert (underdog pick)
      // 2. If prediction agrees with sportsbook on winner → check spread diff >= 4
      // 3. Total diff >= 4 → alert
      let alert = false;
      let spreadAlert = false;
      let totalAlert = false;
      
      // Check spread alert
      if (pred.predictedSpread !== undefined && marketSpread !== null) {
        // Determine market favorite
        // marketSpread: negative = away favored, positive = home favored
        const marketFavorite = marketSpread < 0 ? pred.away : pred.home;
        
        // Determine predicted winner
        // pred.predictedSpread: positive = away wins, negative = home wins
        const predictedWinner = pred.predictedSpread > 0 ? pred.away : 
                               pred.predictedSpread < 0 ? pred.home : null;
        
        console.log(`${pred.away} @ ${pred.home}: Market favorite = ${marketFavorite}, Predicted winner = ${predictedWinner}, Spread diff = ${spreadDiff}`);
        
        if (predictedWinner) {
          // Check if prediction disagrees with market on winner
          if (predictedWinner !== marketFavorite) {
            // Underdog pick → alert
            console.log(`  -> ALERT: Underdog pick (${predictedWinner} vs favorite ${marketFavorite})`);
            spreadAlert = true;
            alert = true;
          } else {
            // Both agree on winner → check spread difference
            if (spreadDiff !== null && spreadDiff >= 4) {
              console.log(`  -> ALERT: Spread diff >= 4 (${spreadDiff})`);
              spreadAlert = true;
              alert = true;
            }
          }
        }
      }
      
      // Check total alert
      if (totalDiff !== null && totalDiff >= 4) {
        totalAlert = true;
        alert = true;
      }
      
      // Normalize team names to canonical form for consistent grouping
      const canonicalHome = getCanonicalName(pred.home);
      const canonicalAway = getCanonicalName(pred.away);
      const canonicalProjectedWinner = projectedWinner === pred.home ? canonicalHome :
                                       projectedWinner === pred.away ? canonicalAway :
                                       projectedWinner;
      
      results.push({
        home: canonicalHome,
        away: canonicalAway,
        predictedSpread: normalizedPredSpread,
        originalSpread: pred.predictedSpread, // Keep original for score calculation
        predictedTotal: pred.predictedTotal,
        marketSpread: normalizedMarketSpread,
        marketTotal,
        spreadDiff,
        totalDiff,
        alert,
        spreadAlert,
        totalAlert,
        source: pred.source,
        gameTime: oddsGame?.commence_time,
        projectedWinner: canonicalProjectedWinner,
      });
    }
    
    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error("Predictions API error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
