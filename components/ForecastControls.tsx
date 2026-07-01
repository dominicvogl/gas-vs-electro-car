"use client";

import type { ForecastSettings } from "@/lib/types";
import { NumberField, Panel, ToggleField } from "./fields";

// Erklärung der durchschnittlichen jährlichen Wachstumsrate (für Info-Tooltips).
const CAGR_EXPLANATION =
  "CAGR (Compound Annual Growth Rate) = durchschnittliche jährliche Wachstumsrate. Sie gibt an, um wie viel Prozent ein Preis im Mittel pro Jahr steigt, zinseszinsartig fortgeschrieben: Preis × (1 + CAGR)^Jahre. Beispiel: 3 %/Jahr lassen den Preis in ~24 Jahren auf das Doppelte steigen.";

export function ForecastControls({
  value,
  onChange,
}: {
  value: ForecastSettings;
  onChange: (v: ForecastSettings) => void;
}) {
  const set = (patch: Partial<ForecastSettings>) => onChange({ ...value, ...patch });

  return (
    <Panel title="Prognose & Szenario">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField
          label="Fahrleistung / Jahr"
          value={value.annualKm}
          onChange={(v) => set({ annualKm: v })}
          unit="km"
          step={1000}
          min={0}
        />
        <NumberField
          label="Betrachtungsdauer"
          value={value.horizonYears}
          onChange={(v) => set({ horizonYears: Math.max(1, Math.round(v)) })}
          unit="Jahre"
          step={1}
          min={1}
          max={30}
        />
        <NumberField
          label="CAGR Kraftstoff"
          value={value.fuelCagrPct}
          onChange={(v) => set({ fuelCagrPct: v })}
          unit="%/a"
          step={0.25}
          hint="Vorbelegt aus der ADAC-Historie 2011–2025."
          info={`${CAGR_EXPLANATION} Dieser Wert schreibt den Kraftstoffpreis pro Jahr fort; vorbelegt aus der historischen ADAC-Preisentwicklung.`}
        />
        <NumberField
          label="CAGR Strom"
          value={value.electricityCagrPct}
          onChange={(v) => set({ electricityCagrPct: v })}
          unit="%/a"
          step={0.25}
          hint="Vorbelegt aus der BDEW-Historie 2011–2025."
          info={`${CAGR_EXPLANATION} Dieser Wert schreibt den Heimlade-Strompreis pro Jahr fort; vorbelegt aus der historischen BDEW-Preisentwicklung.`}
        />
        <NumberField
          label="Band ± (Best/Worst)"
          value={value.bandPct}
          onChange={(v) => set({ bandPct: Math.max(0, v) })}
          unit="%-Pkt"
          step={0.5}
          min={0}
          hint="Spannbreite der CAGR nach oben/unten."
        />
        <div className="flex items-center">
          <div className="w-full rounded-md border border-hairline bg-panel p-3">
            <ToggleField
              label="CO₂-Aufschlag ab 2027"
              checked={value.applyCo2Forward}
              onChange={(v) => set({ applyCo2Forward: v })}
              hint="EU-ETS-2 zusätzlich auf extrapolierte Jahre."
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}
