"use client";

import type {
  AcquisitionMode,
  CombustionVehicle,
  ElectricVehicle,
  FuelType,
} from "@/lib/types";
import { fuelConsumptionUnit, fuelLabel } from "@/lib/labels";
import {
  NumberField,
  Panel,
  SegmentedControl,
  SelectField,
  SliderField,
} from "./fields";

const ACQUISITION_OPTIONS: Array<{ value: AcquisitionMode; label: string }> = [
  { value: "cash", label: "Barkauf" },
  { value: "financing", label: "Finanzierung" },
  { value: "leasing", label: "Leasing" },
];

const FUEL_OPTIONS: Array<{ value: FuelType; label: string }> = [
  { value: "diesel", label: "Diesel" },
  { value: "super_e10", label: "Super E10 (Benzin)" },
  { value: "super_plus", label: "Super Plus (Benzin)" },
];

export function CombustionPanel({
  value,
  onChange,
}: {
  value: CombustionVehicle;
  onChange: (v: CombustionVehicle) => void;
}) {
  const set = (patch: Partial<CombustionVehicle>) => onChange({ ...value, ...patch });
  const setRun = (patch: Partial<CombustionVehicle["running"]>) =>
    onChange({ ...value, running: { ...value.running, ...patch } });

  const label = fuelLabel(value.fuelType);

  return (
    <Panel
      title="Bestandsfahrzeug"
      accent="diesel"
      badge={
        <span className="rounded-full border border-diesel/40 bg-diesel-soft px-2.5 py-0.5 font-mono text-[11px] font-medium text-diesel">
          {label}
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Kraftstoffart"
          value={value.fuelType}
          onChange={(v) => set({ fuelType: v })}
          options={FUEL_OPTIONS}
        />
        <NumberField
          label="Restwert / Verkaufserlös"
          value={value.currentValue}
          onChange={(v) => set({ currentValue: v })}
          unit="€"
          step={500}
          min={0}
          hint="Senkt beim Umstieg die E-Startkurve."
        />
        <NumberField
          label={`Verbrauch (${label})`}
          value={value.consumptionPer100km}
          onChange={(v) => set({ consumptionPer100km: v })}
          unit={fuelConsumptionUnit(value.fuelType)}
          step={0.1}
          min={0}
        />
        <NumberField
          label="Versicherung / Jahr"
          value={value.running.insurance}
          onChange={(v) => setRun({ insurance: v })}
          unit="€"
          step={50}
          min={0}
        />
        <NumberField
          label="Kfz-Steuer / Jahr"
          value={value.running.tax}
          onChange={(v) => setRun({ tax: v })}
          unit="€"
          step={10}
          min={0}
        />
        <NumberField
          label="Instandhaltung / Jahr"
          value={value.running.maintenance}
          onChange={(v) => setRun({ maintenance: v })}
          unit="€"
          step={50}
          min={0}
        />
        <NumberField
          label="Restwert am Ende (optional)"
          value={value.endResidualValue ?? 0}
          onChange={(v) => set({ endResidualValue: v > 0 ? v : undefined })}
          unit="€"
          step={500}
          min={0}
          hint="Wird am Ende der Betrachtung gutgeschrieben."
        />
      </div>
    </Panel>
  );
}

export function ElectricPanel({
  value,
  onChange,
}: {
  value: ElectricVehicle;
  onChange: (v: ElectricVehicle) => void;
}) {
  const set = (patch: Partial<ElectricVehicle>) => onChange({ ...value, ...patch });
  const setRun = (patch: Partial<ElectricVehicle["running"]>) =>
    onChange({ ...value, running: { ...value.running, ...patch } });
  const setCharge = (patch: Partial<ElectricVehicle["charging"]>) =>
    onChange({ ...value, charging: { ...value.charging, ...patch } });
  const setFin = (patch: Partial<ElectricVehicle["financing"]>) =>
    onChange({ ...value, financing: { ...value.financing, ...patch } });
  const setLease = (patch: Partial<ElectricVehicle["leasing"]>) =>
    onChange({ ...value, leasing: { ...value.leasing, ...patch } });

  const mode = value.acquisitionMode;
  const isLeasing = mode === "leasing";

  return (
    <Panel title="E-Auto (neu)" accent="ev">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Kaufpreis"
          value={value.purchasePrice}
          onChange={(v) => set({ purchasePrice: v })}
          unit="€"
          step={500}
          min={0}
          disabled={mode !== "cash"}
          hint={
            mode === "cash"
              ? undefined
              : "Nur bei Barkauf – Finanzierung/Leasing rechnen über die Rate."
          }
        />
        <NumberField
          label="Kaufprämie"
          value={value.purchaseSubsidy}
          onChange={(v) => set({ purchaseSubsidy: v })}
          unit="€"
          step={250}
          min={0}
          hint="Privat gestaffelt 1.500–6.000 €, sonst 0."
        />
      </div>

      <div className="mt-4 border-t border-hairline pt-4">
        <SegmentedControl
          label="Erwerbsart"
          value={mode}
          onChange={(m) => set({ acquisitionMode: m })}
          options={ACQUISITION_OPTIONS}
        />

        {mode === "cash" ? (
          <p className="mt-3 text-[11px] leading-tight text-ink-soft">
            Kaufpreis fließt komplett in die Umstiegsinvestition (abzüglich
            Prämie und Diesel-Verkaufserlös).
          </p>
        ) : null}

        {mode === "financing" ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NumberField
              label="Anzahlung"
              value={value.financing.downPayment}
              onChange={(v) => setFin({ downPayment: v })}
              unit="€"
              step={500}
              min={0}
            />
            <NumberField
              label="Monatsrate"
              value={value.financing.monthlyRate}
              onChange={(v) => setFin({ monthlyRate: v })}
              unit="€/M"
              step={10}
              min={0}
            />
            <NumberField
              label="Laufzeit"
              value={value.financing.termMonths}
              onChange={(v) => setFin({ termMonths: v })}
              unit="Monate"
              step={6}
              min={0}
            />
          </div>
        ) : null}

        {mode === "leasing" ? (
          <div className="mt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField
                label="Sonderzahlung / Anzahlung"
                value={value.leasing.downPayment}
                onChange={(v) => setLease({ downPayment: v })}
                unit="€"
                step={500}
                min={0}
              />
              <NumberField
                label="Monatsrate"
                value={value.leasing.monthlyRate}
                onChange={(v) => setLease({ monthlyRate: v })}
                unit="€/M"
                step={10}
                min={0}
              />
            </div>
            <p className="mt-3 text-[11px] leading-tight text-ink-soft">
              Rate läuft über die gesamte Betrachtungsdauer (Annahme: fortlaufendes
              Leasing). Kein Kaufpreis und kein Restwert – das Auto wird
              zurückgegeben.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-hairline pt-4 sm:grid-cols-2">
        <NumberField
          label="Verbrauch"
          value={value.consumptionPer100km}
          onChange={(v) => set({ consumptionPer100km: v })}
          unit="kWh/100km"
          step={0.5}
          min={0}
        />
        <div className="sm:col-span-2">
          <SliderField
            label="Anteil Laden zu Hause"
            value={value.charging.homeSharePct}
            onChange={(v) => setCharge({ homeSharePct: v })}
            min={0}
            max={100}
            step={5}
            format={(v) => `${v} %`}
          />
        </div>
        <NumberField
          label="Preis zu Hause / PV"
          value={value.charging.homePriceCtKwh}
          onChange={(v) => setCharge({ homePriceCtKwh: v })}
          unit="ct/kWh"
          step={0.5}
          min={0}
          hint="Wächst mit der Strompreis-Prognose."
        />
        <NumberField
          label="Preis Schnelllader"
          value={value.charging.publicPriceCtKwh}
          onChange={(v) => setCharge({ publicPriceCtKwh: v })}
          unit="ct/kWh"
          step={1}
          min={0}
          hint="Bleibt als Nutzerwert konstant."
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-hairline pt-4 sm:grid-cols-2">
        <NumberField
          label="THG-Prämie / Jahr"
          value={value.thgPerYear}
          onChange={(v) => set({ thgPerYear: v })}
          unit="€"
          step={25}
          min={0}
          hint="Grob 150–300 €, 2026 eher niedriger."
        />
        <NumberField
          label="Steuerfrei bis Jahr"
          value={value.taxFreeUntilYear}
          onChange={(v) => set({ taxFreeUntilYear: v })}
          step={1}
          hint="Befreiung bis zu 10 Jahre, längstens Ende 2035."
        />
        <NumberField
          label="Versicherung / Jahr"
          value={value.running.insurance}
          onChange={(v) => setRun({ insurance: v })}
          unit="€"
          step={50}
          min={0}
        />
        <NumberField
          label="Kfz-Steuer / Jahr (nach Befreiung)"
          value={value.running.tax}
          onChange={(v) => setRun({ tax: v })}
          unit="€"
          step={10}
          min={0}
        />
        <NumberField
          label="Instandhaltung / Jahr"
          value={value.running.maintenance}
          onChange={(v) => setRun({ maintenance: v })}
          unit="€"
          step={50}
          min={0}
        />
        <NumberField
          label="Restwert am Ende (optional)"
          value={value.endResidualValue ?? 0}
          onChange={(v) => set({ endResidualValue: v > 0 ? v : undefined })}
          unit="€"
          step={500}
          min={0}
          disabled={isLeasing}
          hint={isLeasing ? "Bei Leasing ohne Wirkung (Rückgabe)." : undefined}
        />
      </div>
    </Panel>
  );
}
