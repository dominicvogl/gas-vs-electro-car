"use client";

import { useId, useState } from "react";

// Parsed eine deutsche oder englische Dezimalzahl (Komma oder Punkt).
function parseNum(text: string): number {
  return Number(text.replace(/\s/g, "").replace(",", "."));
}

// Info-Tooltip: kleines "i", zeigt Erklärtext bei Hover oder Fokus (tastaturfähig).
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`Info: ${text}`}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-hairline bg-panel text-[10px] font-semibold leading-none text-ink-soft hover:border-ev hover:text-ev"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-56 -translate-x-1/2 rounded-md border border-hairline bg-panel-raised p-2.5 text-[11px] leading-snug text-ink opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

interface FieldLabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  info?: string;
}

function FieldLabel({ htmlFor, children, info }: FieldLabelProps) {
  return (
    <span className="flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-soft">
        {children}
      </label>
      {info ? <InfoTip text={info} /> : null}
    </span>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  info?: string;
  disabled?: boolean;
}

// Zahlenfeld mit lokalem Text-Puffer: erlaubt Zwischenzustände ("6,", "") beim Tippen.
export function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
  max,
  hint,
  info,
  disabled = false,
}: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);

  // Externe Änderungen (z. B. Reset) in den Puffer spiegeln – React-Pattern
  // "State beim Rendern anpassen", ohne Effect. Beim Tippen (Puffer parst bereits
  // auf value) bleibt der rohe Text erhalten, damit "6," nicht zu "6" kollabiert.
  if (value !== prevValue) {
    setPrevValue(value);
    if (parseNum(text) !== value) setText(String(value));
  }

  const handleChange = (raw: string) => {
    setText(raw);
    const n = parseNum(raw);
    if (raw.trim() !== "" && Number.isFinite(n)) onChange(n);
  };

  const handleBlur = () => {
    const n = parseNum(text);
    if (text.trim() === "" || !Number.isFinite(n)) {
      setText(String(value));
    } else {
      setText(String(n));
    }
  };

  return (
    <div className={`flex flex-col gap-1 ${disabled ? "opacity-50" : ""}`}>
      <FieldLabel htmlFor={id} info={info}>
        {label}
      </FieldLabel>
      <div
        className={`flex items-stretch overflow-hidden rounded-md border border-hairline ${
          disabled ? "bg-panel" : "bg-panel-raised focus-within:border-ev"
        }`}
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={text}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className="tnum w-full bg-transparent px-3 py-2 font-mono text-sm text-ink outline-none disabled:cursor-not-allowed"
        />
        {unit ? (
          <span className="flex select-none items-center border-l border-hairline bg-panel px-2.5 text-xs text-ink-soft">
            {unit}
          </span>
        ) : null}
      </div>
      {hint ? <span className="text-[11px] leading-tight text-ink-soft">{hint}</span> : null}
    </div>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: SliderFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs font-medium text-ink-soft">
          {label}
        </label>
        <span className="tnum font-mono text-sm text-ink">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-hairline accent-ev"
      />
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: SelectFieldProps<T>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-ink-soft">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-md border border-hairline bg-panel-raised px-3 py-2 text-sm text-ink outline-none focus:border-ev"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}

// Segmentierter Umschalter für einen primären Modus (z. B. Erwerbsart).
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="inline-flex rounded-md border border-hairline bg-panel p-0.5"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={`flex-1 rounded px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-panel-raised font-medium text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}

export function ToggleField({ label, checked, onChange, hint }: ToggleFieldProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col">
        <label htmlFor={id} className="text-xs font-medium text-ink-soft">
          {label}
        </label>
        {hint ? <span className="text-[11px] leading-tight text-ink-soft">{hint}</span> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-ev" : "bg-hairline"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-panel-raised shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// Karten-Sektion mit Titel, optionalem Akzentbalken (Diesel/E-Farbe) und Badge.
export function Panel({
  title,
  accent,
  badge,
  children,
}: {
  title: string;
  accent?: "diesel" | "ev";
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const bar =
    accent === "diesel"
      ? "bg-diesel"
      : accent === "ev"
        ? "bg-ev"
        : "bg-hairline";
  return (
    <section className="rounded-lg border border-hairline bg-panel-raised p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className={`h-4 w-1 rounded-full ${bar}`} aria-hidden />
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
          {title}
        </h2>
        {badge ? <span className="ml-auto">{badge}</span> : null}
      </div>
      {children}
    </section>
  );
}
