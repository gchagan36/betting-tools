import { NextResponse } from "next/server";

type ParsedGame = {
  home: string;
  away: string;
  predictedSpread?: number;
  predictedTotal?: number;
  source: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const gameDate: string = body.gameDate;
    
    if (!gameDate) {
      return NextResponse.json({ ok: false, error: "gameDate is required" }, { status: 400 });
    }
    
    // Convert gameDate from YYYY-MM-DD to M/D/YY format for comparison
    const dateObj = new Date(gameDate);
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const year = dateObj.getFullYear().toString().slice(2);
    const targetDate = `${month}/${day}/${year}`;
    
    // Fetch CSV from Bart Torvik
    const resp = await fetch("https://barttorvik.com/2026_super_sked.csv");
    
    if (!resp.ok) {
      console.error("Torvik API error:", resp.status);
      return NextResponse.json({ 
        ok: false, 
        error: `Torvik API returned ${resp.status}` 
      }, { status: resp.status });
    }
    
    const csvText = await resp.text();
    const lines = csvText.split('\n');
    
    const parsed: ParsedGame[] = [];
    
    // Simple CSV parser that handles quoted fields
    function parseCsvLine(line: string): string[] {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    }
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const cols = parseCsvLine(line);
      
      if (cols.length < 5) continue;
      
      // Column indices: 0=MatchupID, 1=Date, 3=Matchup, 4=Prediction
      const date = cols[1]?.trim();
      const matchup = cols[3]?.trim();
      const prediction = cols[4]?.trim();
      
      // Filter by date
      if (date !== targetDate) continue;
      
      // Parse matchup: "ranking away_team at ranking home_team"
      // Example: "0 Blue Mountain (MS) at 310 Alabama A&M"
      const matchupMatch = matchup?.match(/\d+\s+(.+?)\s+at\s+\d+\s+(.+)/);
      if (!matchupMatch) continue;
      
      const away = matchupMatch[1].trim();
      const home = matchupMatch[2].trim();
      
      // Parse prediction: "Team spread, score-score (prob%)" or "Team (100%)"
      // Example: "Villanova -7.4, 75-68 (72%)" means Villanova wins by 7.4
      // Need to convert to away-home format: negative = home wins, positive = away wins
      let predictedSpread: number | undefined;
      let predictedTotal: number | undefined;
      
      // Match pattern: "TeamName Spread, AwayScore-HomeScore (Prob%)"
      const predMatch = prediction?.match(/^(.+?)\s+([-+]?\d+\.?\d*),\s*(\d+)-(\d+)/);
      if (predMatch) {
        const winningTeam = predMatch[1].trim();
        const marginValue = Math.abs(parseFloat(predMatch[2])); // Get absolute value
        const awayScore = parseInt(predMatch[3]);
        const homeScore = parseInt(predMatch[4]);
        
        // Check if winning team is the away team or home team
        const isAwayWinning = winningTeam.toLowerCase().includes(away.toLowerCase()) || 
                              away.toLowerCase().includes(winningTeam.toLowerCase());
        
        // Convert to standard spread format (away - home)
        // Positive = away wins, Negative = home wins
        if (isAwayWinning) {
          predictedSpread = marginValue; // Away wins by this amount
        } else {
          predictedSpread = -marginValue; // Home wins by this amount
        }
        
        predictedTotal = awayScore + homeScore;
      }
      
      parsed.push({
        home,
        away,
        predictedSpread,
        predictedTotal,
        source: "Bart Torvik",
      });
    }
    
    return NextResponse.json({ ok: true, predictions: parsed });
  } catch (err) {
    console.error("Torvik fetch error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
