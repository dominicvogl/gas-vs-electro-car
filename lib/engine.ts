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
// Verkaufserlös des Diesels und Kaufprämie senken den Start in allen Erwerbsarten.
function evStartInvestment(state: AppState): number {
  const { ev, diesel } = state;
  const credits = ev.purchaseSubsidy + diesel.currentValue;
  switch (ev.acquisitionMode) {
    case "financing":
      return ev.financing.downPayment - credits;
    case "leasing":
      return ev.leasing.downPayment - credits;
    case "cash":
    default:
      return ev.purchasePrice - credits;
  }
}

// Erwerbs-abhängige Monatskosten in Jahr j (1-indexiert).
// Finanzierung: Raten bis Laufzeitende. Leasing: Rate über die gesamte Betrachtungsdauer.
function evMonthlyCostInYear(state: AppState, j: number): number {
  const { ev } = state;
  if (ev.acquisitionMode === "financing") {
    return (
      financingMonthsInYear(ev.financing.termMonths, j) *
      ev.financing.monthlyRate
    );
  }
  if (ev.acquisitionMode === "leasing") {
    return 12 * ev.leasing.monthlyRate;
  }
  return 0;
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

    const monthly = evMonthlyCostInYear(state, j);

    const running =
      energy +
      ev.running.insurance +
      tax +
      ev.running.maintenance -
      ev.thgPerYear +
      monthly;

    cumulative += running;

    // Restwert nur, wenn das Auto am Ende dem Halter gehört (nicht bei Leasing).
    const ownsCar = ev.acquisitionMode !== "leasing";
    if (j === forecast.horizonYears && ownsCar && ev.endResidualValue) {
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
  for (let i = 0; i < horizon; i++) {
    years.push({
      year: i + 1,
      calendarYear: state.startYear + i,
      cumulativeKm: (i + 1) * forecast.annualKm,
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
  const startInvestment = evStartInvestment(state);
  const totalSavings = dieselBase[lastIdx] - evBase[lastIdx];

  // gap(t) = dieselCumulative - evCumulative über die Zeitachse t = 0..horizon.
  // t = 0 ist der Startpunkt: Diesel = 0, E = Netto-Umstiegsinvestition.
  const gap = (t: number): number =>
    t === 0 ? -startInvestment : dieselBase[t - 1] - evBase[t - 1];

  // Nachhaltiger Break-even: nur wenn das E-Auto am Horizont vorn liegt
  // (totalSavings >= 0). Sonst holt es entweder nie auf oder fällt (z. B. bei
  // Leasing) wieder zurück – dann kein echter Umstiegsvorteil.
  let breakEvenYear: number | null = null;
  let breakEvenYearExact: number | null = null;

  if (totalSavings >= 0) {
    // Letzter Zeitpunkt, an dem das E-Auto noch hinten liegt (gap < 0).
    let lastBehind = -1;
    for (let t = 0; t <= horizon; t++) {
      if (gap(t) < 0) lastBehind = t;
    }
    if (lastBehind < 0) {
      // E-Auto von Beginn an günstiger.
      breakEvenYearExact = 0;
      breakEvenYear = 0;
    } else {
      // Nullstelle zwischen lastBehind und lastBehind + 1 interpolieren.
      const g0 = gap(lastBehind);
      const g1 = gap(lastBehind + 1);
      const denom = g1 - g0;
      const frac = denom !== 0 ? (0 - g0) / denom : 0;
      breakEvenYearExact = lastBehind + Math.min(1, Math.max(0, frac));
      breakEvenYear = Math.ceil(breakEvenYearExact);
    }
  }

  return {
    years,
    startInvestment,
    breakEvenYear,
    breakEvenYearExact,
    breakEvenKm:
      breakEvenYearExact === null
        ? null
        : Math.round(breakEvenYearExact * forecast.annualKm),
    dieselCostPerKm: totalKm > 0 ? dieselBase[lastIdx] / totalKm : 0,
    evCostPerKm: totalKm > 0 ? evBase[lastIdx] / totalKm : 0,
    totalSavings,
  };
}

// Re-Export für Convenience (Defaults nutzen ihn ebenfalls).
export { getDefaultElectricityCagr };
