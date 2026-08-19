// src/lib/carbon.ts

export type VehicleType =
  | "car"
  | "motorcycle"
  | "bus"
  | "train"
  | "ev";

export type FuelType =
  | "gasoline"
  | "diesel"
  | "lpg";

export type WasteType =
  | "plastic"
  | "paper"
  | "glass"
  | "metal"
  | "organic"
  | "general";

export type ActivityType =
  | "waste"
  | "transport"
  | "fuel"
  | "electricity";

// kgCO2e / km
export const VEHICLE_FACTORS: Record<VehicleType, number> = {
  car: 0.192,
  motorcycle: 0.103,
  bus: 0.089,
  train: 0.041,
  ev: 0.053,
};

// kgCO2e / liter
export const FUEL_FACTORS: Record<FuelType, number> = {
  gasoline: 2.31,
  diesel: 2.68,
  lpg: 1.51,
};

// kgCO2e saved / kg waste
export const WASTE_FACTORS: Record<WasteType, number> = {
  plastic: 2.5,
  paper: 1.0,
  glass: 0.4,
  metal: 1.8,
  organic: 0.5,
  general: 0.2,
};

// kgCO2e / kWh
export const ELECTRICITY_FACTOR = 0.5;

export function calculateTransportCarbon(
  distanceKm: number,
  vehicle: VehicleType
): number {
  if (!distanceKm || distanceKm <= 0) return 0;

  return distanceKm * (VEHICLE_FACTORS[vehicle] ?? 0);
}

export function calculateFuelCarbon(
  liters: number,
  fuelType: FuelType
): number {
  if (!liters || liters <= 0) return 0;

  return liters * (FUEL_FACTORS[fuelType] ?? 0);
}

export function calculateElectricityCarbon(
  kwh: number
): number {
  if (!kwh || kwh <= 0) return 0;

  return kwh * ELECTRICITY_FACTOR;
}

export function calculateWasteCarbon(
  weightKg: number,
  wasteType: WasteType
): number {
  if (!weightKg || weightKg <= 0) return 0;

  return weightKg * (WASTE_FACTORS[wasteType] ?? 0);
}

export function calculatePoints(carbon: number): number {
  if (!carbon || carbon <= 0) return 0;

  return Math.round(carbon * 10);
}

export function calculateElectricityKwh(
  watt: number,
  hours: number
): number {
  if (!watt || watt <= 0) return 0;
  if (!hours || hours <= 0) return 0;

  return (watt * hours) / 1000;
}