// Rechenkern: Umstiegs-Betrachtung (Variante A).
// Diesel-Pfad startet bei 0 € (Auto ist bezahlt), E-Pfad bei der Netto-Umstiegsinvestition.

import type { AppState, CalcResult, PriceData, YearlyResult } from "./types";
import {
  co2SurchargeEurPerL,
  getBaseFuelPrice,
  getDefaultElectricityCagr,
  projectPrice,
} from "./forecast";

// Anzahl Finanzierungsraten-Monate, die in Jahr j (1-indexiert) fallen.
function financingMonthsInYear(termMonths: number, j: number): number {
  const remaining = termMonths - (j - 1) * 12;
  return Math.min(12, Math.max(0, remaining));
}

// Netto-Umstiegsinvestition, die den E-Pfad zum Start belastet.
function evStartInvestment(state: AppState): number {
  const { ev, diesel } = state;
  if (ev.useFinancing) {
    return ev.financing.downPayment - ev.purchaseSubsidy - diesel.currentValue;
  }
  return ev.purchasePrice - ev.purchaseSubsidy - diesel.currentValue;
}

// Kumulierte Diesel-Gesamtkosten je Jahr (1..horizon) für einen gegebenen Kraftstoff-CAGR.
function dieselCumulativeSeries(
  state: AppState,
  data: PriceData,
  fuelCagrPct: number,
): number[] {
  const { diesel, forecast } = state;
  const baseFuel = getBaseFuelPrice(data, diesel.fuelType);
  const kmFactor = forecast.annualKm / 100;

  const series: number[] = [];
  let cumulative = 0;

  for (let j = 1; j <= forecast.horizonYears; j++) {
    const calendarYear = state.startYear + (j - 1);
    const co2 = co2SurchargeEurPerL(
      data,
      calendarYear,
      diesel.fuelType,
      forecast.applyCo2Forward,
    );
    const pricePerL = projectPrice(baseFuel, fuelCagrPct, j) + co2;
    const energy = kmFactor * diesel.consumptionPer100km * pricePerL;

    const running =
      energy +
      diesel.running.insurance +
      diesel.running.tax +
      diesel.running.maintenance;

    cumulative += running;

    // Restwert am Ende der Betrachtung optional gutschreiben.
    if (j === forecast.horizonYears && diesel.endResidualValue) {
      cumulative -= diesel.endResidualValue;
    }
    series.push(cumulative);
  }
  return series;
}

// Kumulierte E-Gesamtkosten je Jahr (1..horizon) für einen gegebenen Strom-CAGR (Heimanteil).
function evCumulativeSeries(
  state: AppState,
  data: PriceData,
  electricityCagrPct: number,
): number[] {
  const { ev, forecast } = state;
  const kmFactor = forecast.annualKm / 100;
  const homeShare = ev.charging.homeSharePct / 100;
  const publicShare = 1 - homeShare;

  const series: number[] = [];
  let cumulative = evStartInvestment(state);

  for (let j = 1; j <= forecast.horizonYears; j++) {
    const calendarYear = state.startYear + (j - 1);

    // Heimladen wächst mit dem Strom-CAGR, öffentlicher Ladepreis bleibt Nutzerwert (konstant).
    const homeCt = projectPrice(
      ev.charging.homePriceCtKwh,
      electricityCagrPct,
      j,
    );
    const blendCt = homeShare * homeCt + publicShare * ev.charging.publicPriceCtKwh;
    const blendEur = blendCt / 100; // ct/kWh → EUR/kWh
    const energy = kmFactor * ev.consumptionPer100km * blendEur;

    // Kfz-Steuer erst nach Ablauf der Befreiung (Kalenderjahr).
    const tax = calendarYear <= ev.taxFreeUntilYear ? 0 : ev.running.tax;

    const financing = ev.useFinancing
      ? financingMonthsInYear(ev.financing.termMonths, j) *
        ev.financing.monthlyRate
      : 0;

    const running =
      energy +
      ev.running.insurance +
      tax +
      ev.running.maintenance -
      ev.thgPerYear +
      financing;

    cumulative += running;

    if (j === forecast.horizonYears && ev.endResidualValue) {
      cumulative -= ev.endResidualValue;
    }
    series.push(cumulative);
  }
  return series;
}

export function calculate(state: AppState, data: PriceData): CalcResult {
  const { forecast } = state;
  const horizon = forecast.horizonYears;
  const band = forecast.bandPct;

  const fuelCagr = forecast.fuelCagrPct;
  const elecCagr = forecast.electricityCagrPct;

  const dieselBase = dieselCumulativeSeries(state, data, fuelCagr);
  const evBase = evCumulativeSeries(state, data, elecCagr);

  // Bänder: Diesel variiert mit Kraftstoff-CAGR, E-Auto mit Strom-CAGR.
  // Worst = teurer (höherer CAGR), Best = günstiger (niedrigerer CAGR).
  const dieselWorst = dieselCumulativeSeries(state, data, fuelCagr + band);
  const dieselBest = dieselCumulativeSeries(state, data, fuelCagr - band);
  const evWorst = evCumulativeSeries(state, data, elecCagr + band);
  const evBest = evCumulativeSeries(state, data, elecCagr - band);

  const years: YearlyResult[] = [];
  let breakEvenYear: number | null = null;
  let breakEvenYearExact: number | null = null;

  // f(t) = dieselCumulative - evCumulative; Break-even ist die Nullstelle (E holt auf).
  // Basispunkt (Jahr 0): Diesel = 0, E = Netto-Umstiegsinvestition.
  let prevGap = -evStartInvestment(state);

  for (let i = 0; i < horizon; i++) {
    const year = i + 1;
    const gap = dieselBase[i] - evBase[i];
    if (breakEvenYear === null && gap >= 0) {
      breakEvenYear = year;
      // lineare Interpolation zwischen Jahr i (prevGap) und Jahr i+1 (gap)
      const denom = gap - prevGap;
      const frac = denom !== 0 ? (0 - prevGap) / denom : 0;
      breakEvenYearExact = i + Math.min(1, Math.max(0, frac));
    }
    prevGap = gap;
    years.push({
      year,
      calendarYear: state.startYear + i,
      cumulativeKm: year * forecast.annualKm,
      dieselCumulative: dieselBase[i],
      evCumulative: evBase[i],
      dieselBest: dieselBest[i],
      dieselWorst: dieselWorst[i],
      evBest: evBest[i],
      evWorst: evWorst[i],
    });
  }

  const totalKm = forecast.annualKm * horizon;
  const lastIdx = horizon - 1;

  return {
    years,
    breakEvenYear,
    breakEvenYearExact,
    breakEvenKm:
      breakEvenYearExact === null
        ? null
        : Math.round(breakEvenYearExact * forecast.annualKm),
    dieselCostPerKm: totalKm > 0 ? dieselBase[lastIdx] / totalKm : 0,
    evCostPerKm: totalKm > 0 ? evBase[lastIdx] / totalKm : 0,
    totalSavings: dieselBase[lastIdx] - evBase[lastIdx],
  };
}

// Re-Export für Convenience (Defaults nutzen ihn ebenfalls).
export { getDefaultElectricityCagr };
