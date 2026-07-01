"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Line } from "react-chartjs-2";
import type { CalcResult } from "@/lib/types";
import { formatEuro, formatKm } from "@/lib/format";

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin,
);

// Farb-Tokens (Canvas braucht konkrete Werte, keine CSS-Variablen).
const C = {
  diesel: "#b5561e",
  dieselBand: "rgba(181, 86, 30, 0.10)",
  ev: "#0fa3a3",
  evBand: "rgba(15, 163, 163, 0.10)",
  breakeven: "#e4b200",
  ink: "#1a1b1e",
  soft: "#55565b",
  hairline: "#d9d7d1",
};

const MAIN_LABELS = ["Diesel", "E-Auto"];

// prefers-reduced-motion als externer Store – vermeidet setState-in-Effect.
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function CostChart({ result }: { result: CalcResult }) {
  const reducedMotion = useReducedMotion();
  const chartRef = useRef(null);

  const data: ChartData<"line"> = useMemo(() => {
    const pt = (year: number, value: number) => ({ x: year, y: value });
    const years = result.years;
    return {
      datasets: [
        // Diesel-Band (Best = untere Grenze, Worst = obere Grenze, gefüllt)
        {
          label: "_dieselBest",
          data: years.map((y) => pt(y.year, y.dieselBest)),
          borderWidth: 0,
          pointRadius: 0,
          fill: false,
        },
        {
          label: "_dieselWorst",
          data: years.map((y) => pt(y.year, y.dieselWorst)),
          borderWidth: 0,
          pointRadius: 0,
          backgroundColor: C.dieselBand,
          fill: "-1",
        },
        // E-Band
        {
          label: "_evBest",
          data: years.map((y) => pt(y.year, y.evBest)),
          borderWidth: 0,
          pointRadius: 0,
          fill: false,
        },
        {
          label: "_evWorst",
          data: years.map((y) => pt(y.year, y.evWorst)),
          borderWidth: 0,
          pointRadius: 0,
          backgroundColor: C.evBand,
          fill: "-1",
        },
        // Hauptlinien
        {
          label: "Diesel",
          data: years.map((y) => pt(y.year, y.dieselCumulative)),
          borderColor: C.diesel,
          backgroundColor: C.diesel,
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.15,
          fill: false,
        },
        {
          label: "E-Auto",
          data: years.map((y) => pt(y.year, y.evCumulative)),
          borderColor: C.ev,
          backgroundColor: C.ev,
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.15,
          fill: false,
        },
      ],
    };
  }, [result]);

  const options: ChartOptions<"line"> = useMemo(() => {
    const be = result.breakEvenYearExact;
    const beKm = result.breakEvenKm;

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? false : { duration: 500 },
      interaction: { mode: "index", intersect: false, axis: "x" },
      scales: {
        x: {
          type: "linear",
          min: 1,
          max: result.years.length,
          title: { display: true, text: "Jahr", color: C.soft },
          ticks: {
            stepSize: 1,
            color: C.soft,
            callback: (v) => `${v}`,
          },
          grid: { color: C.hairline },
        },
        y: {
          title: { display: true, text: "Kumulierte Kosten", color: C.soft },
          ticks: {
            color: C.soft,
            callback: (v) => formatEuro(Number(v)),
          },
          grid: { color: C.hairline },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: C.ink,
            filter: (item) => MAIN_LABELS.includes(item.text),
            usePointStyle: true,
            boxWidth: 8,
          },
        },
        tooltip: {
          filter: (item) => MAIN_LABELS.includes(item.dataset.label ?? ""),
          backgroundColor: "#ffffff",
          borderColor: C.hairline,
          borderWidth: 1,
          titleColor: C.ink,
          bodyColor: C.ink,
          padding: 10,
          callbacks: {
            title: (items) => {
              const year = items[0]?.parsed.x;
              return `Jahr ${year}`;
            },
            label: (ctx) =>
              `${ctx.dataset.label}: ${formatEuro(Number(ctx.parsed.y))}`,
            afterBody: (items) => {
              const yr = items[0]?.parsed.x;
              const row = result.years.find((y) => y.year === yr);
              if (!row) return "";
              const diff = row.dieselCumulative - row.evCumulative;
              const sign = diff >= 0 ? "E-Auto günstiger" : "Diesel günstiger";
              return `Δ ${formatEuro(Math.abs(diff))} · ${sign}`;
            },
          },
        },
        annotation: {
          annotations:
            be !== null
              ? {
                  breakEven: {
                    type: "line" as const,
                    scaleID: "x",
                    value: be,
                    borderColor: C.breakeven,
                    borderWidth: 2,
                    borderDash: [6, 4],
                    label: {
                      display: true,
                      content: [
                        `Break-even · ${be.toLocaleString("de-DE", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })} J.`,
                        beKm !== null ? `≈ ${formatKm(beKm)}` : "",
                      ].filter(Boolean),
                      position: "start",
                      backgroundColor: C.breakeven,
                      color: C.ink,
                      font: { size: 11, weight: "bold" },
                      padding: 5,
                      borderRadius: 4,
                    },
                  },
                }
              : {},
        },
      },
    };
  }, [result, reducedMotion]);

  return (
    <div className="rounded-lg border border-hairline bg-panel-raised p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="h-4 w-1 rounded-full bg-breakeven" aria-hidden />
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
          Break-even-Kurve
        </h2>
      </div>
      <div className="h-[380px] sm:h-[440px]">
        <Line ref={chartRef} data={data} options={options} />
      </div>
      {result.breakEvenYearExact === null ? (
        <p className="mt-3 text-xs text-ink-soft">
          Kein Break-even innerhalb des Betrachtungszeitraums – das E-Auto bleibt
          in den kumulierten Kosten über dem Diesel. Band = Best-/Worst-Case aus
          der Preisprognose (CAGR ± Band).
        </p>
      ) : (
        <p className="mt-3 text-xs text-ink-soft">
          Gelbe Marke = Break-even. Bänder = Best-/Worst-Case aus der
          Preisprognose (CAGR ± Band).
        </p>
      )}
    </div>
  );
}
