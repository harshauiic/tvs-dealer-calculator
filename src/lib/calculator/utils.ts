import type { GlobalSettings, PincodeRow, RateMasterRow } from "./types";

export function lookupEqZone(
  pincode: string,
  pincodes: PincodeRow[] | Map<string, number>,
): number | null {
  if (!pincode || pincode.length !== 6) return null;
  if (pincodes instanceof Map) {
    return pincodes.get(pincode) ?? null;
  }
  const row = pincodes.find((p) => p.pincode === pincode);
  return row?.eq_zone ?? null;
}

export function buildPincodeMap(pincodes: PincodeRow[]): Map<string, number> {
  return new Map(pincodes.map((p) => [p.pincode, p.eq_zone]));
}

export function findRateRow(
  occupancy: string,
  eqZone: number,
  rateMaster: RateMasterRow[],
): RateMasterRow | undefined {
  return rateMaster.find((r) => r.occupancy === occupancy && r.eq_zone === eqZone);
}

export function computeFireRate(
  row: RateMasterRow,
  totalSI: number,
  withTerrorism: boolean,
  settings: GlobalSettings,
): number {
  const underThreshold = totalSI < settings.si_threshold;

  if (underThreshold) {
    const base =
      (row.iib_rate + row.eq_rate + row.stfi_rate) *
      (1 - settings.sookshama_discount_pct / 100);
    return withTerrorism ? base + row.terrorism_rate : base;
  }

  const base =
    row.iib_rate * (1 - settings.iib_discount_pct / 100) +
    row.eq_rate * (1 - row.discount_eq_over_5cr / 100) +
    row.stfi_rate * (1 - row.discount_stfi_over_5cr / 100);
  return withTerrorism ? base + row.terrorism_rate : base;
}

export function computeFloaterContextRate(
  occupancy: string,
  eqZone: number,
  nonStockSI: number,
  withTerrorism: boolean,
  rateMaster: RateMasterRow[],
  settings: GlobalSettings,
): number | null {
  const row = findRateRow(occupancy, eqZone, rateMaster);
  if (!row) return null;
  const floaterSI = nonStockSI + settings.floater_si_cap;
  return computeFireRate(row, floaterSI, withTerrorism, settings);
}

export function isNumericPremium(value: number | string): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

export function sumPremiums(values: Array<number | string>): number {
  return values.reduce<number>((acc, v) => {
    if (typeof v === "number") return acc + v;
    return acc;
  }, 0);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function generateReferenceNumber(): string {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TVSM-${ymd}-${rand}`;
}
