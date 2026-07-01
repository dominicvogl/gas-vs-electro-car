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

const EV_LABEL = "E-Auto";

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

export function CostChart({
  result,
  combustionLabel,
}: {
  result: CalcResult;
  combustionLabel: string;
}) {
  const reducedMotion = useReducedMotion();
  const chartRef = useRef(null);

  const data: ChartData<"line"> = useMemo(() => {
    const years = result.years;
    const start = result.startInvestment;
    // Startpunkt t = 0: Diesel = 0, E = Netto-Umstiegsinvestition. Macht den
    // Anfangs-Vorsprung/-Rückstand und Break-evens im ersten Jahr sichtbar.
    const dieselSeries = (pick: (y: (typeof years)[number]) => number) => [
      { x: 0, y: 0 },
      ...years.map((y) => ({ x: y.year, y: pick(y) })),
    ];
    const evSeries = (pick: (y: (typeof years)[number]) => number) => [
      { x: 0, y: start },
      ...years.map((y) => ({ x: y.year, y: pick(y) })),
    ];

    return {
      datasets: [
        // Diesel-Band (Best = untere Grenze, Worst = obere Grenze, gefüllt)
        {
          label: "_dieselBest",
          data: dieselSeries((y) => y.dieselBest),
          borderWidth: 0,
          pointRadius: 0,
          fill: false,
        },
        {
          label: "_dieselWorst",
          data: dieselSeries((y) => y.dieselWorst),
          borderWidth: 0,
          pointRadius: 0,
          backgroundColor: C.dieselBand,
          fill: "-1",
        },
        // E-Band
        {
          label: "_evBest",
          data: evSeries((y) => y.evBest),
          borderWidth: 0,
          pointRadius: 0,
          fill: false,
        },
        {
          label: "_evWorst",
          data: evSeries((y) => y.evWorst),
          borderWidth: 0,
          pointRadius: 0,
          backgroundColor: C.evBand,
          fill: "-1",
        },
        // Hauptlinien
        {
          label: combustionLabel,
          data: dieselSeries((y) => y.dieselCumulative),
          borderColor: C.diesel,
          backgroundColor: C.diesel,
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.15,
          fill: false,
        },
        {
          label: EV_LABEL,
          data: evSeries((y) => y.evCumulative),
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
  }, [result, combustionLabel]);

  const options: ChartOptions<"line"> = useMemo(() => {
    const be = result.breakEvenYearExact;
    const beKm = result.breakEvenKm;
    const mainLabels = [combustionLabel, EV_LABEL];

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? false : { duration: 500 },
      interaction: { mode: "index", intersect: false, axis: "x" },
      scales: {
        x: {
          type: "linear",
          min: 0,
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
            filter: (item) => mainLabels.includes(item.text),
            usePointStyle: true,
            boxWidth: 8,
          },
        },
        tooltip: {
          filter: (item) => mainLabels.includes(item.dataset.label ?? ""),
          backgroundColor: "#ffffff",
          borderColor: C.hairline,
          borderWidth: 1,
          titleColor: C.ink,
          bodyColor: C.ink,
          padding: 10,
          callbacks: {
            title: (items) => {
              const year = items[0]?.parsed.x;
              return year === 0 ? "Start (heute)" : `Jahr ${year}`;
            },
            label: (ctx) =>
              `${ctx.dataset.label}: ${formatEuro(Number(ctx.parsed.y))}`,
            afterBody: (items) => {
              const yr = items[0]?.parsed.x;
              const diff =
                yr === 0
                  ? 0 - result.startInvestment
                  : (() => {
                      const row = result.years.find((y) => y.year === yr);
                      return row ? row.dieselCumulative - row.evCumulative : NaN;
                    })();
              if (Number.isNaN(diff)) return "";
              const sign = diff >= 0 ? "E-Auto günstiger" : "Diesel günstiger";
              return `Δ ${formatEuro(Math.abs(diff))} · ${sign}`;
            },
          },
        },
        annotation: {
          annotations:
            be !== null && be > 0
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
  }, [result, reducedMotion, combustionLabel]);

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
          Kein nachhaltiger Break-even – das E-Auto liegt am Ende des Zeitraums
          über dem Diesel. Bänder = Best-/Worst-Case aus der Preisprognose
          (CAGR ± Band).
        </p>
      ) : result.breakEvenYearExact <= 0 ? (
        <p className="mt-3 text-xs text-ink-soft">
          Das E-Auto ist von Beginn an günstiger (Diesel-Verkaufserlös deckt den
          Umstieg). Bänder = Best-/Worst-Case aus der Preisprognose (CAGR ± Band).
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
