// Anzeige-Labels für Aufzählungswerte (dynamisch je nach Auswahl).

import type { FuelType } from "./types";

export function fuelLabel(fuel: FuelType): string {
  switch (fuel) {
    case "diesel":
      return "Diesel";
    case "super_e10":
      return "Super E10";
    case "super_plus":
      return "Super Plus";
  }
}

// Kraftstoff-Einheit (alle drei Sorten sind flüssig → L/100km).
export function fuelConsumptionUnit(fuel: FuelType): string {
  switch (fuel) {
    case "diesel":
    case "super_e10":
    case "super_plus":
      return "L/100km";
  }
}
