# Project Summary

This repo currently has an odds calculator. I'd like to add another tool: a prediction analysis.

I currently use three sources for sports betting predictions. They can either be in one combined Excel sheet or three separate CSVs (your choice). Sportsbook odds are retrieved via an API. I want a tool that can compare the predictions and odds, and highlight games where the lines are much different from the predictions. 

This should have the ability to store secrets (as the API will use authentication). Authentication uses a query param "apiKey" to provide the api token. 

# Requirements
## UI
### Navigation
This app should auto navigate to the prediction analysis page. There should be a navbar with links to both the betting calculator and the prediction analysis.

### Form
This app should be able to accept CSV or XLSX uploads via a UI button. It should be able to accept multiple uploads at once since there are at least three sources. There should be a date field so that odds can be pulled for the date specified. The API key should not be entered, it should already exist in the backend.

## Functionality
After prediction analysis, it should return all of the games but highlight the ones that match the following criteria.
- The spread is 4 points or more from the sportsbook lines.
- The total is 4 points or more from the sportsbook lines.
- Underdog teams that are predicted to win by 2 points or more.

## Stability
Any changes made to this app should be tested and verified. Unit tests are a must.

## APIs
### TheOddsAPI
Odds are retrieved from TheOddsAPI. You can retrieve the odds via the details below.
`GET https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds?apiKey={{apiKey}}&regions=us&oddsFormat=american&commenceTimeFrom={{TIMESTAMP_UTC}}

### KenPom
The KenPom API calls are below. Authorization is done via API key in a bearer token (`Bearer <API_KEY>`).

# References
You can find samples of the sources in CSV format in the [csv_samples](csv_samples)
