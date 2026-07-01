// Sinnvolle Default-Werte (Deutschland, Stand 2026). CAGR und Heimlade-Preis
// werden aus der Historie in prices.json vorbelegt und bleiben im UI überschreibbar.

import type { AppState } from "./types";
import { priceData } from "./prices";
import {
  getBaseHouseholdElectricityCt,
  getBasePublicDcCt,
  getDefaultElectricityCagr,
  getDefaultFuelCagr,
} from "./forecast";

// Startjahr = aktuelles Kalenderjahr (Betrachtung beginnt "jetzt").
const START_YEAR = 2026;

export function buildDefaultState(): AppState {
  const homeCt = Math.round(getBaseHouseholdElectricityCt(priceData) * 10) / 10;
  const publicCt = Math.round(getBasePublicDcCt(priceData));

  return {
    startYear: START_YEAR,
    diesel: {
      currentValue: 15000,
      fuelType: "diesel",
      consumptionPer100km: 6.5,
      running: {
        insurance: 600,
        tax: 300,
        maintenance: 800,
      },
    },
    ev: {
      purchasePrice: 42000,
      purchaseSubsidy: 0,
      useFinancing: false,
      financing: {
        monthlyRate: 450,
        termMonths: 48,
        downPayment: 5000,
      },
      consumptionPer100km: 17,
      charging: {
        homeSharePct: 80,
        homePriceCtKwh: homeCt,
        publicPriceCtKwh: publicCt,
      },
      thgPerYear: 100,
      taxFreeUntilYear: 2035,
      running: {
        insurance: 700,
        tax: 150, // greift erst nach Ablauf der Steuerbefreiung
        maintenance: 400,
      },
    },
    forecast: {
      annualKm: 15000,
      horizonYears: 10,
      fuelCagrPct: getDefaultFuelCagr(priceData, "diesel"),
      electricityCagrPct: getDefaultElectricityCagr(priceData),
      bandPct: 2,
      applyCo2Forward: true,
    },
  };
}

export const DEFAULT_STATE = buildDefaultState();
