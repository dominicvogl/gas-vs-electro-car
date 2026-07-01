"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppState } from "@/lib/types";
import { calculate } from "@/lib/engine";
import { priceData } from "@/lib/prices";
import { buildDefaultState } from "@/lib/defaults";
import { clearState, loadState, saveState } from "@/lib/storage";
import { DieselPanel, ElectricPanel } from "@/components/InputPanel";
import { ForecastControls } from "@/components/ForecastControls";
import { CostChart } from "@/components/CostChart";
import { ResultCards } from "@/components/ResultCards";

export default function Home() {
  const [state, setState] = useState<AppState>(() => buildDefaultState());
  const [loaded, setLoaded] = useState(false);

  // Gespeichertes Szenario einmalig nach dem Mounten laden. Bewusst im Effect:
  // localStorage darf beim SSR/ersten Render nicht gelesen werden (Hydration-Mismatch),
  // deshalb hier die stricte Heuristik-Regel gezielt deaktiviert.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setState(loadState());
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Änderungen persistieren – erst nachdem der gespeicherte Stand geladen wurde.
  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded]);

  const result = useMemo(() => calculate(state, priceData), [state]);

  const handleReset = () => {
    clearState();
    setState(buildDefaultState());
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            TCO-Prüfstand · Deutschland 2026
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Diesel behalten <span className="text-ink-soft">vs.</span>{" "}
            E-Auto neu
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Bestehenden Diesel weiterfahren oder verkaufen und elektrisch
            neu kaufen? Der Diesel startet bei 0 €, der Verkaufserlös senkt die
            E-Startkurve. Alle Werte sind editierbar und bleiben lokal gespeichert.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-hairline bg-panel-raised px-3 py-2 text-sm text-ink transition-colors hover:bg-panel"
        >
          Zurücksetzen
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DieselPanel
          value={state.diesel}
          onChange={(diesel) => setState((s) => ({ ...s, diesel }))}
        />
        <ElectricPanel
          value={state.ev}
          onChange={(ev) => setState((s) => ({ ...s, ev }))}
        />
      </div>

      <div className="mt-4">
        <ForecastControls
          value={state.forecast}
          onChange={(forecast) => setState((s) => ({ ...s, forecast }))}
        />
      </div>

      <div className="mt-4">
        <CostChart result={result} />
      </div>

      <div className="mt-4">
        <ResultCards result={result} horizonYears={state.forecast.horizonYears} />
      </div>

      <footer className="mt-8 border-t border-hairline pt-4 text-xs text-ink-soft">
        Modell-Variante A (Umstiegs-Betrachtung). Preisbasis:{" "}
        {priceData.meta.source_notes ? "ADAC / BDEW / BEHG" : "prices.json"}. Ohne
        Zinsen auf gebundenes Kapital und ohne Inflationsbereinigung. Keine
        Steuerberatung – Orientierungswerte für die eigene Entscheidung.
      </footer>
    </main>
  );
}
