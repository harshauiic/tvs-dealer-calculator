import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { GlobalSettings, PincodeRow, RateMasterRow } from "../calculator";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export async function fetchRateMaster(): Promise<RateMasterRow[]> {
  if (!supabase) {
    const mod = await import("../../data/rate_master.json");
    return mod.default as RateMasterRow[];
  }
  const { data, error } = await supabase.from("rate_master").select("*").order("occupancy").order("eq_zone");
  if (error) throw error;
  return (data ?? []).map(mapRateRow);
}

export async function fetchGlobalSettings(): Promise<GlobalSettings> {
  if (!supabase) {
    const mod = await import("../../data/global_settings.json");
    return mod.default as GlobalSettings;
  }
  const { data, error } = await supabase.from("global_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return mapSettings(data);
}

export async function fetchPincodeMap(): Promise<Map<string, number>> {
  localStorage.removeItem("tvs_pincodes_v1");
  const cacheKey = "tvs_pincodes_v2";
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as PincodeRow[];
      return new Map(parsed.map((p) => [p.pincode, p.eq_zone]));
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  if (!supabase) {
    const mod = await import("../../data/pincodes.sample.json");
    const rows = mod.default as PincodeRow[];
    return new Map(rows.map((p) => [p.pincode, p.eq_zone]));
  }

  const all: PincodeRow[] = [];
  let from = 0;
  // Supabase/PostgREST returns at most 1000 rows per request by default.
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("pincodes")
      .select("pincode, eq_zone")
      .order("pincode", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...(data as PincodeRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  localStorage.setItem(cacheKey, JSON.stringify(all));
  return new Map(all.map((p) => [p.pincode, p.eq_zone]));
}

export async function lookupPincodeEqZone(pincode: string): Promise<number | null> {
  if (!supabase) {
    const map = await fetchPincodeMap();
    return map.get(pincode) ?? null;
  }
  const { data, error } = await supabase
    .from("pincodes")
    .select("eq_zone")
    .eq("pincode", pincode)
    .maybeSingle();
  if (error) throw error;
  return data?.eq_zone ?? null;
}

export async function saveProposal(
  insuredName: string,
  referenceNumber: string,
  payload: unknown,
  ratesSnapshot: unknown,
) {
  if (!supabase) {
    const key = `proposal_${referenceNumber}`;
    localStorage.setItem(key, JSON.stringify({ insuredName, payload, ratesSnapshot }));
    return { reference_number: referenceNumber };
  }
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      insured_name: insuredName,
      reference_number: referenceNumber,
      payload,
      rates_snapshot: ratesSnapshot,
    })
    .select("reference_number")
    .single();
  if (error) throw error;
  return data;
}

export async function loadProposal(referenceNumber: string) {
  if (!supabase) {
    const raw = localStorage.getItem(`proposal_${referenceNumber}`);
    if (!raw) return null;
    return JSON.parse(raw);
  }
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("reference_number", referenceNumber)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listProposals(limit = 50) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("proposals")
    .select("id, reference_number, insured_name, created_at, payload")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function updateRateMaster(rows: RateMasterRow[]) {
  if (!supabase) throw new Error("Supabase not configured");
  for (const row of rows) {
    const { error } = await supabase
      .from("rate_master")
      .update({
        iib_rate: row.iib_rate,
        eq_rate: row.eq_rate,
        stfi_rate: row.stfi_rate,
        terrorism_rate: row.terrorism_rate,
        discount_under_5cr: row.discount_under_5cr,
        discount_iib_over_5cr: row.discount_iib_over_5cr,
        discount_eq_over_5cr: row.discount_eq_over_5cr,
        discount_stfi_over_5cr: row.discount_stfi_over_5cr,
        rate_under_5cr_without_terror: row.rate_under_5cr_without_terror,
        rate_over_5cr_without_terror: row.rate_over_5cr_without_terror,
        rate_under_5cr_with_terror: row.rate_under_5cr_with_terror,
        rate_over_5cr_with_terror: row.rate_over_5cr_with_terror,
      })
      .eq("occupancy", row.occupancy)
      .eq("eq_zone", row.eq_zone);
    if (error) throw error;
  }
}

export async function updateGlobalSettings(
  settings: GlobalSettings,
  keys?: ReadonlyArray<keyof GlobalSettings>,
) {
  if (!supabase) throw new Error("Supabase not configured");

  const keysToUpdate =
    keys ??
    ([
      "burglary_rate_pct",
      "mbd_rate_per_thousand",
      "plate_glass_rate_pct",
      "neon_sign_rate_pct",
      "public_liability_rate_pct",
      "fidelity_rate_pct",
      "money_without_terror_rate_pct",
      "money_with_terror_rate_pct",
      "gst_rate_pct",
      "si_threshold",
      "floater_si_cap",
      "max_location_si",
      "limit_money_annual_carrying",
      "limit_money_single_carrying",
      "limit_money_cash_in_safe",
      "limit_money_cash_in_till",
      "limit_public_liability_si",
      "limit_fidelity_employees",
      "limit_fidelity_floater_si",
      "limit_fidelity_per_employee",
    ] as const);

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  for (const key of keysToUpdate) {
    payload[key] = settings[key];
  }

  const { error } = await supabase
    .from("global_settings")
    .update(payload)
    .eq("id", 1);
  if (error) throw error;
}

export async function adminLogin(email: string, password: string) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function adminLogout() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

function mapRateRow(row: Record<string, unknown>): RateMasterRow {
  return {
    occupancy: String(row.occupancy),
    eq_zone: Number(row.eq_zone),
    iib_rate: Number(row.iib_rate),
    eq_rate: Number(row.eq_rate),
    stfi_rate: Number(row.stfi_rate),
    terrorism_rate: Number(row.terrorism_rate),
    discount_under_5cr: Number(row.discount_under_5cr),
    discount_iib_over_5cr: Number(row.discount_iib_over_5cr),
    discount_eq_over_5cr: Number(row.discount_eq_over_5cr),
    discount_stfi_over_5cr: Number(row.discount_stfi_over_5cr),
    rate_under_5cr_without_terror: Number(row.rate_under_5cr_without_terror),
    rate_over_5cr_without_terror: Number(row.rate_over_5cr_without_terror),
    rate_under_5cr_with_terror: Number(row.rate_under_5cr_with_terror),
    rate_over_5cr_with_terror: Number(row.rate_over_5cr_with_terror),
  };
}

function mapSettings(row: Record<string, unknown>): GlobalSettings {
  const num = (key: string, fallback = 0) =>
    row[key] === undefined || row[key] === null ? fallback : Number(row[key]);

  return {
    sookshama_discount_pct: num("sookshama_discount_pct"),
    iib_discount_pct: num("iib_discount_pct"),
    burglary_rate_pct: num("burglary_rate_pct"),
    mbd_rate_per_thousand: num("mbd_rate_per_thousand"),
    plate_glass_rate_pct: num("plate_glass_rate_pct"),
    neon_sign_rate_pct: num("neon_sign_rate_pct"),
    public_liability_rate_pct: num("public_liability_rate_pct"),
    fidelity_rate_pct: num("fidelity_rate_pct"),
    money_without_terror_rate_pct: num("money_without_terror_rate_pct"),
    money_with_terror_rate_pct: num("money_with_terror_rate_pct"),
    gst_rate_pct: num("gst_rate_pct"),
    si_threshold: num("si_threshold"),
    floater_si_cap: num("floater_si_cap"),
    max_location_si: num("max_location_si", 500_000_000),
    limit_money_annual_carrying: num("limit_money_annual_carrying", 500_000_000),
    limit_money_single_carrying: num("limit_money_single_carrying", 500_000_000),
    limit_money_cash_in_safe: num("limit_money_cash_in_safe", 500_000_000),
    limit_money_cash_in_till: num("limit_money_cash_in_till", 500_000_000),
    limit_public_liability_si: num("limit_public_liability_si", 500_000_000),
    limit_fidelity_employees: num("limit_fidelity_employees", 100_000),
    limit_fidelity_floater_si: num("limit_fidelity_floater_si", 500_000_000),
    limit_fidelity_per_employee: num("limit_fidelity_per_employee", 500_000_000),
  };
}
