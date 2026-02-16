import json

sportsbook = {
    {
        "name": "VMI Keydets",
        "price": -110,
        "point": 10.5
    },
    {
        "name": "Wofford Terriers",
        "price": -110,
        "point": -10.5
    }
}

bart = {
    "homeTeam": "VMI",
    "awayTeam": "Wofford",
    "homeScore": 72,
    "awayScore": 80
}

for spread in sportsbook:
    if spread["point"].startswith("-"):
        favorite = spread["name"]
        break

if bart["homeScore"] > bart["awayScore"]:
    winner = bart["homeTeam"]
    diff = bart["homeScore"] - bart["awayScore"]
elif bart["awayScore"] > bart["homeScore"]:
    winner = bart["awayTeam"]
    diff = bart["awayScore"] - bart["homeScore"]

if favorite != winner:
    print("Underdog predicted to win")
else:
    if diff >= 4:
        print("Favorite predicted to win by 4 or more points")