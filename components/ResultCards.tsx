"use client";

import type { CalcResult } from "@/lib/types";
import { formatEuro, formatEuroPerKm, formatKm, formatYears } from "@/lib/format";

function Card({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: "diesel" | "ev" | "breakeven";
  children: React.ReactNode;
}) {
  const border =
    accent === "diesel"
      ? "border-t-diesel"
      : accent === "ev"
        ? "border-t-ev"
        : accent === "breakeven"
          ? "border-t-breakeven"
          : "border-t-hairline";
  return (
    <div className={`rounded-lg border border-hairline border-t-2 ${border} bg-panel-raised p-5`}>
      <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function ResultCards({
  result,
  horizonYears,
  combustionLabel,
}: {
  result: CalcResult;
  horizonYears: number;
  combustionLabel: string;
}) {
  const { breakEvenYearExact, breakEvenKm, dieselCostPerKm, evCostPerKm, totalSavings } =
    result;
  const evWins = totalSavings > 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Held: der Break-even-Punkt */}
      <Card label="Break-even" accent="breakeven">
        {breakEvenYearExact !== null && breakEvenYearExact <= 0 ? (
          <div>
            <div className="font-display text-3xl font-semibold text-ink">
              Sofort
            </div>
            <p className="mt-2 text-xs leading-snug text-ink-soft">
              Das E-Auto ist von Beginn an günstiger – der Diesel-Verkaufserlös
              deckt den Umstieg.
            </p>
          </div>
        ) : breakEvenYearExact !== null ? (
          <div>
            <div className="tnum font-display text-3xl font-semibold text-ink">
              {formatYears(breakEvenYearExact)}
            </div>
            <div className="tnum mt-1 font-mono text-sm text-ink-soft">
              ≈ {breakEvenKm !== null ? formatKm(breakEvenKm) : "–"}
            </div>
            <p className="mt-2 text-xs leading-snug text-ink-soft">
              Ab hier liegt das E-Auto in den kumulierten Kosten vorn.
            </p>
          </div>
        ) : (
          <div>
            <div className="font-display text-xl font-semibold text-ink">
              Kein Break-even
            </div>
            <p className="mt-2 text-xs leading-snug text-ink-soft">
              Innerhalb von {horizonYears} Jahren rechnet sich der Umstieg mit
              diesen Annahmen nicht. Längeren Horizont oder andere Werte testen.
            </p>
          </div>
        )}
      </Card>

      <Card label="Kosten je Kilometer">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-diesel">{combustionLabel}</span>
          <span className="tnum font-mono text-xl font-semibold text-ink">
            {formatEuroPerKm(dieselCostPerKm)}
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-hairline pt-2">
          <span className="text-xs text-ev">E-Auto</span>
          <span className="tnum font-mono text-xl font-semibold text-ink">
            {formatEuroPerKm(evCostPerKm)}
          </span>
        </div>
        <p className="mt-2 text-xs leading-snug text-ink-soft">
          Kumulierte Gesamtkosten über {horizonYears} Jahre je gefahrenem km.
        </p>
      </Card>

      <Card label="Gesamtersparnis" accent={evWins ? "ev" : "diesel"}>
        <div
          className={`tnum font-display text-3xl font-semibold ${
            evWins ? "text-ev" : "text-diesel"
          }`}
        >
          {evWins ? "" : "−"}
          {formatEuro(Math.abs(totalSavings))}
        </div>
        <p className="mt-2 text-xs leading-snug text-ink-soft">
          {evWins
            ? `Vorteil des E-Autos gegenüber dem weitergefahrenen ${combustionLabel} nach ${horizonYears} Jahren.`
            : `Mehrkosten des E-Autos gegenüber dem ${combustionLabel} nach ${horizonYears} Jahren.`}
        </p>
      </Card>
    </div>
  );
}
