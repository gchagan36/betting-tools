// Team name alias groups: canonical name -> all variants
const TEAM_NAME_GROUPS: Record<string, string[]> = {
  "Alabama State": ["Alabama State", "Alabama St."],
  "Alcorn State": ["Alcorn State", "Alcorn St."],
  "Appalachian State": ["Appalachian State", "App State", "Appalachian St"],
  "Ball State": ["Ball State", "Ball St."],
  "Cal Baptist": ["Cal Baptist", "California Baptist"],
  "Cal State Bakersfield": ["Cal State Bakersfield", "CSU Bakersfield", "Bakersfield"],
  "Cal State Fullerton": ["Cal State Fullerton", "CSU Fullerton", "Cal St. Fullerton"],
  "Central Connecticut": ["Central Connecticut", "Central Connecticut State"],
  "Chicago State": ["Chicago State", "Chicago St."],
  "Cleveland State": ["Cleveland State", "Cleveland St."],
  "Connecticut": ["Connecticut", "UConn"],
  "Delaware State": ["Delaware State", "Delaware St."],
  "Detroit Mercy": ["Detroit Mercy", "Detroit"],
  "FIU": ["FIU", "Florida International", "Florida Int'l", "Florida International University"],
  "Fresno State": ["Fresno State", "Fresno St."],
  "Gardner-Webb": ["Gardner-Webb", "Gardner Webb"],
  "George Washington": ["George Washington", "GW"],
  "Idaho State": ["Idaho State", "Idaho St."],
  "Illinois State": ["Illinois State", "Illinois St."],
  "Iowa State": ["Iowa State", "Iowa St."],
  "Jackson State": ["Jackson State", "Jackson St."],
  "Jacksonville State": ["Jacksonville State", "Jacksonville St."],
  "Kansas City": ["Kansas City", "UMKC", "Missouri KC"],
  "Kansas State": ["Kansas State", "Kansas St."],
  "Kennesaw State": ["Kennesaw State", "Kennesaw St."],
  "Kent State": ["Kent State", "Kent St."],
  "Long Beach State": ["Long Beach State", "Long Beach St."],
  "Long Island": ["Long Island", "LIU", "Long Island University"],
  "Loyola MD": ["Loyola MD", "Loyola Maryland"],
  "LSU": ["LSU", "Louisiana State"],
  "McNeese State": ["McNeese State", "McNeese St.", "McNeese"],
  "Miami (OH)": ["Miami (OH)", "Miami Ohio"],
  "Michigan State": ["Michigan State", "Michigan St."],
  "Middle Tennessee": ["Middle Tennessee", "MTSU", "Middle Tennessee State", "Middle Tenn"],
  "Mississippi State": ["Mississippi State", "Mississippi St."],
  "Missouri State": ["Missouri State", "Missouri St."],
  "Morehead State": ["Morehead State", "Morehead St."],
  "Murray State": ["Murray State", "Murray St."],
  "Nebraska Omaha": ["Nebraska Omaha", "Omaha"],
  "New Mexico State": ["New Mexico State", "New Mexico St."],
  "Ohio State": ["Ohio State", "Ohio St."],
  "Ole Miss": ["Ole Miss", "Mississippi"],
  "Oregon State": ["Oregon State", "Oregon St."],
  "Penn State": ["Penn State", "Penn St."],
  "Portland State": ["Portland State", "Portland St."],
  "Sacramento State": ["Sacramento State", "Sacramento St."],
  "Saint Bonaventure": ["Saint Bonaventure", "St. Bonaventure"],
  "Saint Joseph's": ["Saint Joseph's", "St. Joseph's", "St Joseph's"],
  "Saint Louis": ["Saint Louis", "St. Louis"],
  "Saint Mary's": ["Saint Mary's", "St. Mary's"],
  "Saint Peter's": ["Saint Peter's", "St. Peter's"],
  "Sam Houston State": ["Sam Houston State", "Sam Houston St."],
  "San Jose State": ["San Jose State", "San Jose St."],
  "SIU Edwardsville": ["SIU Edwardsville", "SIUE", "Southern Illinois Edwardsville"],
  "South Dakota State": ["South Dakota State", "South Dakota St."],
  "Southeast Missouri State": ["Southeast Missouri State", "SE Missouri State", "Southeast Mo. State", "Southeast Missouri St.", "Southeast Missouri"],
  "Southern Miss": ["Southern Miss", "Southern Mississippi"],
  "Stephen F. Austin": ["Stephen F. Austin", "Stephen F Austin"],
  "St. Francis PA": ["St. Francis PA", "St. Francis (PA)", "Saint Francis PA", "Saint Francis"],
  "Tarleton State": ["Tarleton State", "Tarleton St."],
  "Tennessee State": ["Tennessee State", "Tennessee St."],
  "Texas State": ["Texas State", "Texas St."],
  "UCF": ["UCF", "Central Florida"],
  "UL Monroe": ["UL Monroe", "Louisiana Monroe", "ULM"],
  "USC": ["USC", "Southern California", "Southern Cal"],
  "USC Upstate": ["USC Upstate", "South Carolina Upstate"],
  "UT Martin": ["UT Martin", "Tennessee Martin", "UTM"],
  "Utah State": ["Utah State", "Utah St."],
  "VCU": ["VCU", "Virginia Commonwealth"],
  "Weber State": ["Weber State", "Weber St."],
  "Wichita State": ["Wichita State", "Wichita St."] 
};

// Build canonical names lookup: any variant -> canonical name
const CANONICAL_NAMES: Record<string, string> = {};
for (const [canonical, variants] of Object.entries(TEAM_NAME_GROUPS)) {
  for (const variant of variants) {
    CANONICAL_NAMES[variant] = canonical;
  }
}

// Build team aliases lookup: any variant -> all other variants
const TEAM_ALIASES: Record<string, string[]> = {};
for (const [canonical, variants] of Object.entries(TEAM_NAME_GROUPS)) {
  for (const variant of variants) {
    // Store all variants except itself
    TEAM_ALIASES[variant] = variants.filter(v => v !== variant);
  }
}

/**
 * Get the canonical (standardized) name for a team
 * @param name - Any team name variant
 * @returns The canonical team name
 */
export function getCanonicalName(name: string): string {
  const trimmed = name.trim();
  return CANONICAL_NAMES[trimmed] || trimmed;
}

/**
 * Get all name variants for a team (for matching purposes)
 * @param name - Any team name variant
 * @returns Array of all variants including the input name
 */
export function normalizeTeamName(name: string): string[] {
  const normalized = name.trim();
  const aliases = TEAM_ALIASES[normalized] || [];
  return [normalized, ...aliases];
}
