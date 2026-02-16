import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SECRETS_PATH = path.resolve(process.cwd(), ".secrets.json");

async function readKenpomApiKey(): Promise<string | null> {
  try {
    if (process.env.KENPOM_API_KEY) return process.env.KENPOM_API_KEY;
    if (!fs.existsSync(SECRETS_PATH)) return null;
    const raw = fs.readFileSync(SECRETS_PATH, "utf8");
    const data = JSON.parse(raw);
    return data.kenpomApiKey ?? null;
  } catch (err) {
    return null;
  }
}

type KenpomGame = {
  Season: number;
  GameID: number;
  DateOfGame: string;
  Visitor: string;
  Home: string;
  HomeRank: number;
  VisitorRank: number;
  HomePred: number;
  VisitorPred: number;
  HomeWP: number;
  PredTempo: number;
  ThrillScore: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const gameDate: string = body.gameDate;
    
    if (!gameDate) {
      return NextResponse.json({ ok: false, error: "gameDate is required" }, { status: 400 });
    }
    
    const apiKey = await readKenpomApiKey();
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "KenPom API key not set" }, { status: 400 });
    }
    
    // Fetch from KenPom Fanmatch endpoint
    const url = `https://kenpom.com/api.php?endpoint=fanmatch&d=${gameDate}`;
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (!resp.ok) {
      console.error("KenPom API error:", resp.status, await resp.text());
      return NextResponse.json({ 
        ok: false, 
        error: `KenPom API returned ${resp.status}` 
      }, { status: resp.status });
    }
    
    const games: KenpomGame[] = await resp.json();
    
    // Convert to ParsedGame format
    const parsed = games.map(g => ({
      home: g.Home,
      away: g.Visitor,
      predictedSpread: g.VisitorPred - g.HomePred, // negative = home favored
      predictedTotal: g.HomePred + g.VisitorPred,
      predictedHomeWinProb: g.HomeWP,
      source: "KenPom API",
    }));
    
    return NextResponse.json({ ok: true, predictions: parsed });
  } catch (err: any) {
    console.error("KenPom fetch error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
