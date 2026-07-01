// Prognose-Modul: Basispreis-Ermittlung aus der Historie und Fortschreibung per CAGR.
// Einheiten: Kraftstoff in EUR/L, Haushaltsstrom/Ladestrom in ct/kWh.

import type { FuelType, PriceData } from "./types";

// Erstes Zukunftsjahr, ab dem der EU-ETS-2-Aufschlag NEU addiert werden darf.
// Für Kalenderjahre <= 2026 ist der nationale CO2-Anteil bereits im Tankpreis enthalten.
export const CO2_FORWARD_FROM_YEAR = 2027;

type FuelColumn = "diesel_eur_l" | "super_e10_eur_l" | "super_plus_eur_l";

export function fuelColumn(fuel: FuelType): FuelColumn {
  switch (fuel) {
    case "diesel":
      return "diesel_eur_l";
    case "super_e10":
      return "super_e10_eur_l";
    case "super_plus":
      return "super_plus_eur_l";
  }
}

// Jüngster nicht-null Wert einer Spalte (von hinten nach vorne gesucht).
function latestNonNull(
  rows: Array<Record<string, number | string | null | undefined>>,
  key: string,
): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i][key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

// Basis-Kraftstoffpreis (Jahr 0) in EUR/L. super_plus ist in der Historie leer →
// Fallback auf super_e10 (Super Plus liegt real leicht darüber, in v1 gleichgesetzt).
export function getBaseFuelPrice(data: PriceData, fuel: FuelType): number {
  const direct = latestNonNull(data.fuel_prices_annual, fuelColumn(fuel));
  if (direct !== null) return direct;
  const fallback = latestNonNull(data.fuel_prices_annual, "super_e10_eur_l");
  return fallback ?? 1.9;
}

// Basis-Haushaltsstrompreis (Jahr 0) in ct/kWh – für die Vorbelegung des Heimlade-Preises.
export function getBaseHouseholdElectricityCt(data: PriceData): number {
  return latestNonNull(data.electricity_prices_annual, "household_ct_kwh") ?? 37;
}

// Jüngster beobachteter öffentlicher DC-Ladepreis in ct/kWh – für die Vorbelegung.
export function getBasePublicDcCt(data: PriceData): number {
  return latestNonNull(data.electricity_prices_annual, "public_dc_ct_kwh") ?? 63;
}

// Default-CAGR (%) je Reihe aus projection_hints.
export function getDefaultFuelCagr(data: PriceData, fuel: FuelType): number {
  const hints = data.projection_hints;
  const v =
    fuel === "diesel" ? hints.diesel_cagr_pct : hints.super_e10_cagr_pct;
  return typeof v === "number" ? v : 1;
}

export function getDefaultElectricityCagr(data: PriceData): number {
  const v = data.projection_hints.electricity_cagr_pct;
  return typeof v === "number" ? v : 3;
}

// Fortschreibung: price(j) = price0 * (1 + cagr/100)^j.
export function projectPrice(
  base: number,
  cagrPct: number,
  yearOffset: number,
): number {
  return base * Math.pow(1 + cagrPct / 100, yearOffset);
}

// CO2-Aufschlag (EUR/L) für ein Kalenderjahr, nur wenn aktiviert und Jahr >= 2027.
// Für Kalenderjahre jenseits der Trajektorie wird der letzte bekannte Wert gehalten.
export function co2SurchargeEurPerL(
  data: PriceData,
  calendarYear: number,
  fuel: FuelType,
  apply: boolean,
): number {
  if (!apply || calendarYear < CO2_FORWARD_FROM_YEAR) return 0;

  const key: "diesel_surcharge_ct_l" | "petrol_surcharge_ct_l" =
    fuel === "diesel" ? "diesel_surcharge_ct_l" : "petrol_surcharge_ct_l";

  const rows = data.co2_price_trajectory.filter(
    (r) => r.year >= CO2_FORWARD_FROM_YEAR && typeof r[key] === "number",
  );
  if (rows.length === 0) return 0;

  // exakte Jahres-Übereinstimmung, sonst letzter (jüngster) verfügbarer Wert halten
  const exact = rows.find((r) => r.year === calendarYear);
  const row = exact ?? rows[rows.length - 1];
  const ct = row[key] as number;
  return ct / 100; // ct → EUR
}

// CAGR aus zwei Stützpunkten: (end/start)^(1/n) - 1, in Prozent.
export function cagrFromEndpoints(
  start: number,
  end: number,
  n: number,
): number {
  if (start <= 0 || n <= 0) return 0;
  return (Math.pow(end / start, 1 / n) - 1) * 100;
}
