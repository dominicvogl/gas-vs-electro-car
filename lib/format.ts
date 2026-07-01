// de-DE-Formatierung für €, ct, %, km. Tabellenziffern-Optik im UI via CSS.

const eur0 = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eur2 = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const num0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatEuro(value: number): string {
  return eur0.format(value);
}

// Volle €-Cent-Genauigkeit (z. B. für €/km).
export function formatEuroPrecise(value: number): string {
  return eur2.format(value);
}

// €/km läuft feiner: 3 Nachkommastellen.
export function formatEuroPerKm(value: number): string {
  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value)} €`;
}

export function formatKm(value: number): string {
  return `${num0.format(value)} km`;
}

export function formatPercent(value: number): string {
  return `${num1.format(value)} %`;
}

export function formatYears(value: number): string {
  return `${num1.format(value)} Jahre`;
}
