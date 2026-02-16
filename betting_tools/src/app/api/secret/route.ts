import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SECRETS_PATH = path.resolve(process.cwd(), ".secrets.json");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const theOddsApiKey = body.theOddsApiKey || body.apiKey || null;
    const kenpomApiKey = body.kenpomApiKey || null;
    
    // Read existing data if it exists
    let existingData: any = {};
    if (fs.existsSync(SECRETS_PATH)) {
      const raw = fs.readFileSync(SECRETS_PATH, "utf8");
      existingData = JSON.parse(raw);
    }
    
    // Merge with new data
    const data = {
      theOddsApiKey: theOddsApiKey || existingData.theOddsApiKey || existingData.apiKey || null,
      kenpomApiKey: kenpomApiKey || existingData.kenpomApiKey || null,
    };
    
    fs.writeFileSync(SECRETS_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(SECRETS_PATH)) return NextResponse.json({ theOddsApiKey: null, kenpomApiKey: null });
    const raw = fs.readFileSync(SECRETS_PATH, "utf8");
    const data = JSON.parse(raw);
    return NextResponse.json({ 
      theOddsApiKey: data.theOddsApiKey || data.apiKey || null,
      kenpomApiKey: data.kenpomApiKey || null 
    });
  } catch (err: any) {
    return NextResponse.json({ theOddsApiKey: null, kenpomApiKey: null });
  }
}
