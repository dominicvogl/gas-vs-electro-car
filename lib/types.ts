// Domänen- und Datenmodell für den TCO-Rechner "Diesel behalten vs. E-Auto neu".
// Alle Geldbeträge in EUR, sofern nicht anders benannt (ct = Cent).

// Antriebsart des Verbrenners (für Preis-Lookup)
export type FuelType = "diesel" | "super_e10" | "super_plus";

// Gemeinsame laufende Kosten (Jahresbeträge in EUR)
export interface RunningCosts {
  insurance: number; // Versicherung / Jahr
  tax: number; // Kfz-Steuer / Jahr
  maintenance: number; // Instandhaltung/Wartung / Jahr
}

// Bestehender Diesel (Variante A: bereits bezahlt)
export interface CombustionVehicle {
  currentValue: number; // aktueller Restwert = Verkaufserlös bei Umstieg (EUR)
  fuelType: FuelType;
  consumptionPer100km: number; // L/100km
  running: RunningCosts;
  endResidualValue?: number; // optional: Restwert am Ende der Betrachtung (EUR)
}

// Erwerbsart des E-Autos.
export type AcquisitionMode = "cash" | "financing" | "leasing";

// Finanzierung des E-Autos (Kauf auf Raten, Eigentum verbleibt beim Halter)
export interface Financing {
  monthlyRate: number; // EUR/Monat
  termMonths: number; // Laufzeit in Monaten
  downPayment: number; // Anzahlung EUR
}

// Leasing des E-Autos (Nutzung ohne Eigentum, Rückgabe am Ende, kein Restwert)
export interface Leasing {
  monthlyRate: number; // EUR/Monat (läuft über die gesamte Betrachtungsdauer)
  downPayment: number; // Sonderzahlung / Anzahlung EUR
}

// Lade-Mix des E-Autos
export interface ChargingMix {
  homeSharePct: number; // Anteil Laden zu Hause, 0–100
  homePriceCtKwh: number; // ct/kWh zu Hause / PV
  publicPriceCtKwh: number; // ct/kWh Schnelllader (öffentlich)
}

// Neues E-Auto
export interface ElectricVehicle {
  purchasePrice: number; // Kaufpreis (EUR) – bei Leasing nicht verwendet
  purchaseSubsidy: number; // Kaufprämie, EUR (Default 0)
  acquisitionMode: AcquisitionMode; // Barkauf / Finanzierung / Leasing
  financing: Financing; // genutzt bei acquisitionMode = "financing"
  leasing: Leasing; // genutzt bei acquisitionMode = "leasing"
  consumptionPer100km: number; // kWh/100km
  charging: ChargingMix;
  thgPerYear: number; // THG-Prämie / Jahr (EUR)
  taxFreeUntilYear: number; // Kalenderjahr, bis einschließlich dem Kfz-Steuer 0 ist (z. B. 2035)
  running: RunningCosts; // tax greift erst nach taxFreeUntilYear
  endResidualValue?: number; // optional: Restwert am Ende (EUR); bei Leasing ohne Wirkung
}

// Prognose-/Szenario-Einstellungen
export interface ForecastSettings {
  annualKm: number; // Fahrleistung / Jahr
  horizonYears: number; // Betrachtungsdauer (z. B. 10)
  fuelCagrPct: number; // Basis-Steigerung Kraftstoff (aus prices.json vorbelegt)
  electricityCagrPct: number; // Basis-Steigerung Strom
  bandPct: number; // ± Punkte für Best/Worst (z. B. 2)
  applyCo2Forward: boolean; // ab 2027 CO2-Aufschlag auf Kraftstoff addieren
}

// Kompletter, persistierbarer Eingabe-State
export interface AppState {
  startYear: number; // Kalenderjahr des Betrachtungsstarts (Jahr 1)
  diesel: CombustionVehicle;
  ev: ElectricVehicle;
  forecast: ForecastSettings;
}

// --- Struktur der prices.json -------------------------------------------------
// Die realen Datensätze enthalten zusätzlich pro Zeile ein "quality"-Feld sowie
// einen "sources"-Block; beide sind für den Rechenkern irrelevant und optional.

export interface FuelPriceRow {
  year: number;
  diesel_eur_l: number | null;
  super_e10_eur_l: number | null;
  super_plus_eur_l: number | null;
  quality?: string;
  [key: string]: number | string | null | undefined;
}

export interface ElectricityPriceRow {
  year: number;
  household_ct_kwh: number | null;
  public_ac_ct_kwh: number | null;
  public_dc_ct_kwh: number | null;
  quality?: string;
  [key: string]: number | string | null | undefined;
}

export interface Co2Row {
  year: number;
  eur_per_tonne: number | null;
  diesel_surcharge_ct_l: number | null;
  petrol_surcharge_ct_l: number | null;
  note?: string;
}

export interface ProjectionHints {
  diesel_cagr_pct: number | null;
  super_e10_cagr_pct: number | null;
  electricity_cagr_pct: number | null;
  [key: string]: number | string | null;
}

export interface PriceData {
  meta: Record<string, string>;
  fuel_prices_annual: FuelPriceRow[];
  electricity_prices_annual: ElectricityPriceRow[];
  co2_price_trajectory: Co2Row[];
  projection_hints: ProjectionHints;
  sources?: Array<Record<string, string>>;
}

// --- Ergebnisstruktur ---------------------------------------------------------

// Ergebnis pro Jahr (für Chart + Kennzahlen)
export interface YearlyResult {
  year: number; // 1..horizon
  calendarYear: number; // startYear + (year - 1)
  cumulativeKm: number;
  dieselCumulative: number; // kumulierte Gesamtkosten Diesel (Basis)
  evCumulative: number; // kumulierte Gesamtkosten E (Basis)
  dieselBest: number;
  dieselWorst: number;
  evBest: number;
  evWorst: number;
}

export interface CalcResult {
  years: YearlyResult[];
  startInvestment: number; // Netto-Umstiegsinvestition (E-Startpunkt bei t = 0)
  breakEvenYear: number | null; // erstes ganzes Jahr, in dem E nachhaltig vorn liegt (0 = von Beginn an)
  breakEvenYearExact: number | null; // linear interpolierter Break-even (Jahre, z. B. 8,4)
  breakEvenKm: number | null;
  dieselCostPerKm: number; // am Ende des Horizonts
  evCostPerKm: number;
  totalSavings: number; // dieselCumulative - evCumulative am Horizont (positiv = E günstiger)
}
