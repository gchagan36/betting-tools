# Betting Tools

A Next.js application for sports betting analysis, featuring a risk calculator and prediction analysis tool.

## Features

### 1. Betting Risk Calculator
Calculate the risk amount needed for sports bets based on:
- American odds (e.g., -110, +150)
- Target total units
- Unit amount in dollars

### 2. Prediction Analysis Tool
Compare sports betting predictions from multiple sources against live sportsbook odds:
- **Multi-Source Analysis**: Combine KenPom, Bart Torvik, and Sideline predictions
- **KenPom API Integration**: Fetch live predictions directly from KenPom (requires API key)
- **Bart Torvik API Integration**: Fetch predictions from Bart Torvik's comprehensive CSV (free, no API key)
- **Sideline CSV Upload**: Optional upload for additional prediction data
- **TheOddsAPI Integration**: Live NCAAB odds with spreads and totals
- **Alert Criteria**:
  - Spread differences of 4+ points
  - Total differences of 4+ points
  - Underdog teams predicted to win by 2+ points

## Getting Started

### Installation

```bash
npm install
```

### Configuration

1. **Get API Keys**:
   - [TheOddsAPI](https://the-odds-api.com/) - For live sportsbook odds (required)
   - [KenPom API](https://kenpom.com/) - For game predictions (optional, KenPom only)

2. **Set TheOddsAPI Key** (choose one method):
   
   **Option A - Environment Variables:**
   ```bash
   export THE_ODDS_API_KEY=your_odds_api_key_here
   export KENPOM_API_KEY=your_kenpom_api_key_here
   ```
   
   **Option B - Direct API Call:**
   ```bash
   # Set both keys
   curl -X POST http://localhost:3000/api/secret \
     -H "Content-Type: application/json" \
     -d '{"theOddsApiKey":"your_odds_key","kenpomApiKey":"your_kenpom_key"}'
   
   # Or set individually
   curl -X POST http://localhost:3000/api/secret \
     -H "Content-Type: application/json" \
     -d '{"theOddsApiKey":"your_odds_key"}'
   
   curl -X POST http://localhost:3000/api/secret \
     -H "Content-Type: application/json" \
     -d '{"kenpomApiKey":"your_kenpom_key"}'
   ```
   
   **Option C - Create .secrets.json file:**
   ```bash
   echo '{
     "theOddsApiKey": "your_odds_key_here",
     "kenpomApiKey": "your_kenpom_key_here"
   }' > .secrets.json
   chmod 600 .secrets.json
   ```

### Running the App

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start

# Run tests
npm test

# Run tests in watch mode
npm test:watch
```

Open [http://localhost:3000](http://localhost:3000) - the app will auto-redirect to the Predictions page.

## Usage

### Prediction Analysis Workflow

The tool supports **combining multiple prediction sources** for comprehensive analysis:

1. **Select Sources**:
   - ☑️ **KenPom API** - Requires API key, high quality predictions
   - ☑️ **Bart Torvik** - Free, no API key, comprehensive coverage
   - 📄 **Sideline CSV** - Optional upload for additional predictions

2. **Set Game Date**: Choose the date to analyze

3. **Fetch All Predictions**: Click "Fetch All Predictions" to load from all selected sources

4. **Run Analysis**: Compare all predictions against live market odds from TheOddsAPI

5. **Review Results**: Games meeting alert criteria are highlighted with a ⚠️ indicator

**Note**: You can use any combination of sources. All predictions are combined and compared against the same market odds, giving you multiple perspectives on each game.

### Alert Criteria Details

Games are flagged when:
- **Spread Discrepancy**: |Predicted Spread - Market Spread| ≥ 4 points
- **Total Discrepancy**: |Predicted Total - Market Total| ≥ 4 points
- **Underdog Value**: Market underdog is predicted to win by 2+ points

## Project Structure

```
betting_tools/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── predictions/
│   │   │   │   ├── route.ts          # Predictions API endpoint
│   │   │   │   └── __tests__/
│   │   │   │       └── route.test.ts # Unit tests
│   │   │   └── secret/
│   │   │       └── route.ts          # API key storage endpoint
│   │   ├── calculator/
│   │   │   └── page.tsx              # Risk calculator page
│   │   ├── predictions/
│   │   │   └── page.tsx              # Prediction analysis page
│   │   ├── layout.tsx                # Root layout with navigation
│   │   ├── page.tsx                  # Home (redirects to predictions)
│   │   └── globals.css               # Global styles
│   └── ...
├── jest.config.js                     # Jest configuration
├── jest.setup.js                      # Jest setup
└── package.json                       # Dependencies and scripts
```

## API Endpoints

### POST `/api/secret`
Store API keys server-side in `.secrets.json`

**Request Body:**
```json
{
  "theOddsApiKey": "your_odds_api_key",
  "kenpomApiKey": "your_kenpom_api_key"
}
```

### GET `/api/secret`
Retrieve stored API keys

### POST `/api/kenpom`
Fetch predictions from KenPom API

**Request Body:**
```json
{
  "gameDate": "2026-02-01"
}
```

### POST `/api/torvik`
Fetch predictions from Bart Torvik CSV (no API key required)

**Request Body:**
```json
{
  "gameDate": "2026-02-01"
}
```

### POST `/api/predictions`
Compare predictions against market odds from TheOddsAPI

**Request Body:**
```json
{
  "predictions": [
    {
      "home": "Duke",
      "away": "UNC",
      "predictedSpread": -5.5,
      "predictedTotal": 150.0,
      "source": "KenPom"
    }
  ],
  "gameDate": "2026-02-01"
}
```

**Response:**
```json
{
  "ok": true,
  "results": [
    {
      "home": "Duke",
      "away": "UNC",
      "predictedSpread": -5.5,
      "marketSpread": -3.0,
      "spreadDiff": 2.5,
      "predictedTotal": 150.0,
      "marketTotal": 147.5,
      "totalDiff": 2.5,
      "alert": false
    }
  ]
}
```

## Testing

Unit tests cover:
- Alert criteria logic (spread, total, underdog detection)
- Spread difference calculations
- Team name matching algorithms

Run tests:
```bash
npm test
```

## Technologies

- **Framework**: Next.js 15 with Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Testing**: Jest
- **APIs**: TheOddsAPI (odds), KenPom API (predictions), Bart Torvik CSV (predictions)

## Security

- API keys are stored in `.secrets.json` with restrictive file permissions (mode 600)
- Supports environment variable `API_KEY` as an alternative
- Input validation and error handling on all endpoints

## License

Private project


