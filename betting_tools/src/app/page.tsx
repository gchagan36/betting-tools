"use client";
import { useState, useEffect } from "react";


function calculateRisk(odds: number, targetTotal: number = 3.0): number {
  if (odds < 0) {
    return targetTotal / (1 + 100 / Math.abs(odds));
  } else {
    return targetTotal / (1 + odds / 100);
  }
}


export default function Home() {
  const [odds, setOdds] = useState<string>("-110");
  const [targetTotal, setTargetTotal] = useState<string>("3.0");
  const [unitAmount, setUnitAmount] = useState<string>("10");
  const [risk, setRisk] = useState<number | null>(null);
  const [riskDollars, setRiskDollars] = useState<number | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const oddsNum = Number(odds);
    const targetNum = Number(targetTotal);
    const unitNum = Number(unitAmount);
    if (
      odds === "" ||
      targetTotal === "" ||
      unitAmount === "" ||
      isNaN(oddsNum) ||
      isNaN(targetNum) ||
      isNaN(unitNum) ||
      unitNum <= 0
    ) {
      setError("Please enter valid numbers for odds, target total, and unit amount (unit > 0).");
      setRisk(null);
      setRiskDollars(null);
      return;
    }
    setError("");
    const riskUnits = calculateRisk(oddsNum, targetNum);
    setRisk(riskUnits);
    setRiskDollars(riskUnits * unitNum);
  }, [odds, targetTotal, unitAmount]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-3xl font-bold mb-6 text-center" style={{ color: "black" }}>Betting Risk Calculator</h1>
  <form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="odds">
            American Odds
          </label>
          <input
            id="odds"
            type="number"
            value={odds}
            onChange={e => setOdds(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="e.g. -136 or 150"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="targetTotal">
            Target Total (Risk + Win)
          </label>
          <input
            id="targetTotal"
            type="number"
            step="any"
            value={targetTotal}
            onChange={e => setTargetTotal(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="e.g. 3.0"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="unitAmount">
            Unit Amount (in dollars)
          </label>
          <input
            id="unitAmount"
            type="number"
            step="any"
            value={unitAmount}
            onChange={e => setUnitAmount(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="e.g. 100"
            required
          />
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        {risk !== null && !error && (
          <div className="mt-6 text-center">
            <p className="text-lg font-semibold" style={{ color: "black" }}>Units to Risk:</p>
            <p className="text-2xl text-blue-600 font-bold">{risk.toFixed(4)}</p>
            <p className="text-lg font-semibold mt-4" style={{ color: "black" }}>Amount to Risk (in dollars):</p>
            <p className="text-2xl text-green-600 font-bold">${riskDollars?.toFixed(2)}</p>
          </div>
        )}
      </form>
      <footer className="text-gray-500 text-xs mt-8 text-center">
        &copy; {new Date().getFullYear()} Betting Risk Calculator
      </footer>
    </div>
  );
}
