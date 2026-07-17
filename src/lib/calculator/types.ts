export const OCCUPANCY_TYPES = [
  "Office premises",
  "Motor vehicle Showrooms (Sales and Service)",
  "Motor Vehicle Garages (No sales)",
  "Stockyard (Vehicles stored in closed warehouse)",
  "Stockyard (Vehicles stored in Open warehouse)",
] as const;

export type OccupancyType = (typeof OCCUPANCY_TYPES)[number];

export type CoverOption = "Cover Opted" | "Cover Not Opted";
export type FireCoverOption =
  | "Cover Opted without Terrorism"
  | "Cover Opted with Terrorism";
export type MoneyCoverOption =
  | "Cover Opted without Terrorism"
  | "Cover Opted with Terrorism"
  | "Cover Not Opted";

export type MoneyCoverToggle = "Opted" | "Not Opted";

export type TerrorismScope =
  | "Only fire cover"
  | "Both fire and money in transit";

export interface TerrorismCover {
  opted: boolean;
  scope: TerrorismScope | "";
}

export interface FloaterCover {
  enabled: boolean;
  floater_sum_insured: number;
  max_sum_insured_per_location: number;
}
export type ClaimsHistory =
  | "Select"
  | "Nil claims in the past 3 years"
  | "We have claimed in the past 3 years";

export interface RateMasterRow {
  occupancy: string;
  eq_zone: number;
  iib_rate: number;
  eq_rate: number;
  stfi_rate: number;
  terrorism_rate: number;
  discount_under_5cr: number;
  discount_iib_over_5cr: number;
  discount_eq_over_5cr: number;
  discount_stfi_over_5cr: number;
  rate_under_5cr_without_terror: number;
  rate_over_5cr_without_terror: number;
  rate_under_5cr_with_terror: number;
  rate_over_5cr_with_terror: number;
}

export interface GlobalSettings {
  sookshama_discount_pct: number;
  iib_discount_pct: number;
  burglary_rate_pct: number;
  mbd_rate_per_thousand: number;
  plate_glass_rate_pct: number;
  neon_sign_rate_pct: number;
  public_liability_rate_pct: number;
  fidelity_rate_pct: number;
  money_without_terror_rate_pct: number;
  money_with_terror_rate_pct: number;
  gst_rate_pct: number;
  si_threshold: number;
  floater_si_cap: number;
  max_location_si: number;
  limit_fire_building_si: number;
  limit_fire_plant_machinery_si: number;
  limit_fire_furniture_si: number;
  limit_fire_plate_glass_si: number;
  limit_fire_neon_sign_si: number;
  limit_fire_stocks_si: number;
  limit_money_annual_carrying: number;
  limit_money_single_carrying: number;
  limit_money_cash_in_safe: number;
  limit_money_cash_in_till: number;
  limit_public_liability_si: number;
  limit_fidelity_employees: number;
  limit_fidelity_floater_si: number;
  limit_fidelity_per_employee: number;
}

export interface PincodeRow {
  pincode: string;
  eq_zone: number;
}

export interface LocationMoney {
  cover: MoneyCoverToggle;
  annual_carrying_limit: number;
  single_carrying_limit: number;
  cash_in_safe: number;
  cash_in_till: number;
}

export interface LocationInput {
  id: string;
  dealer_code: string;
  address: string;
  pincode: string;
  occupancy: OccupancyType | "";
  insurance_company: string;
  period_of_cover: string;
  claims_history: ClaimsHistory;
  building_si: number;
  plant_machinery_si: number;
  furniture_si: number;
  plate_glass_si: number;
  neon_sign_si: number;
  stocks_si: number;
  money: LocationMoney;
}

export interface GlobalSections {
  burglary: CoverOption;
  mbd_eei: CoverOption;
  plate_glass: CoverOption;
  neon_sign: CoverOption;
  public_liability: CoverOption;
  fidelity: CoverOption;
  public_liability_si: number;
  fidelity_employees: number;
  fidelity_floater_si: number;
  fidelity_per_employee_limit: number;
}

export interface ProposalInput {
  insured_name: string;
  communication_address: string;
  gstin_number: string;
  hypothecation_1: string;
  hypothecation_2: string;
  hypothecation_3: string;
  terrorism: TerrorismCover;
  floater_cover: FloaterCover;
  locations: LocationInput[];
  sections: GlobalSections;
  remarks: string;
}

export function defaultProposalInput(): ProposalInput {
  return {
    insured_name: "",
    communication_address: "",
    gstin_number: "",
    hypothecation_1: "",
    hypothecation_2: "",
    hypothecation_3: "",
    terrorism: defaultTerrorismCover(),
    floater_cover: defaultFloaterCover(),
    locations: [createEmptyLocation()],
    sections: defaultGlobalSections(),
    remarks: "",
  };
}

export function defaultTerrorismCover(): TerrorismCover {
  return { opted: false, scope: "" };
}

export function defaultFloaterCover(): FloaterCover {
  return {
    enabled: false,
    floater_sum_insured: 0,
    max_sum_insured_per_location: 0,
  };
}

/** Fill missing insured-detail fields on older saved proposals. */
export function normalizeProposalInput(
  input: Partial<ProposalInput> & Pick<ProposalInput, "locations" | "sections">,
): ProposalInput {
  return {
    ...defaultProposalInput(),
    ...input,
    gstin_number: input.gstin_number ?? "",
    hypothecation_1: input.hypothecation_1 ?? "",
    hypothecation_2: input.hypothecation_2 ?? "",
    hypothecation_3: input.hypothecation_3 ?? "",
    terrorism: normalizeTerrorismCover(input),
    floater_cover: normalizeFloaterCover(input),
    locations: (input.locations?.length ? input.locations : [createEmptyLocation()]).map(
      normalizeLocationInput,
    ),
    sections: normalizeGlobalSections(input.sections),
    remarks: input.remarks ?? "",
  };
}

function normalizeTerrorismCover(
  input: Partial<ProposalInput> & { sections?: GlobalSections },
): TerrorismCover {
  if (input.terrorism) {
    const scope =
      (input.terrorism.scope as string) === "Only money in transit cover"
        ? "Only fire cover"
        : input.terrorism.scope ?? "";
    return {
      opted: input.terrorism.opted ?? false,
      scope,
    };
  }
  return defaultTerrorismCover();
}

function normalizeFloaterCover(
  input: Partial<ProposalInput> & { sections?: GlobalSections },
): FloaterCover {
  if (input.floater_cover) {
    return {
      enabled: input.floater_cover.enabled ?? false,
      floater_sum_insured: input.floater_cover.floater_sum_insured ?? 0,
      max_sum_insured_per_location:
        input.floater_cover.max_sum_insured_per_location ?? 0,
    };
  }
  const legacySections = input.sections as (GlobalSections & { stock_floater?: CoverOption }) | undefined;
  const legacyStockFloater =
    legacySections?.stock_floater === "Cover Opted" ||
    (input as { stock_floater?: string }).stock_floater === "Cover Opted";
  return {
    ...defaultFloaterCover(),
    enabled: legacyStockFloater,
  };
}

function normalizeLocationInput(loc: LocationInput & { fire_cover?: FireCoverOption }): LocationInput {
  const moneyCover =
    loc.money?.cover === "Opted" || loc.money?.cover === "Not Opted"
      ? loc.money.cover
      : loc.money?.cover === "Cover Not Opted"
        ? "Not Opted"
        : "Opted";
  return {
    ...loc,
    money: {
      ...loc.money,
      cover: moneyCover,
    },
  };
}

function normalizeGlobalSections(sections?: GlobalSections & { stock_floater?: CoverOption }): GlobalSections {
  if (!sections) return defaultGlobalSections();
  const { stock_floater: _removed, ...rest } = sections;
  return {
    ...defaultGlobalSections(),
    ...rest,
  };
}

export function syncSectionsWithLocations(
  sections: GlobalSections,
  locations: LocationInput[],
): GlobalSections {
  const hasPlant = locations.some((l) => l.plant_machinery_si > 0);
  const hasNeon = locations.some((l) => l.neon_sign_si > 0);
  const hasPlate = locations.some((l) => l.plate_glass_si > 0);

  return {
    ...sections,
    mbd_eei: hasPlant ? sections.mbd_eei : "Cover Not Opted",
    neon_sign: hasNeon ? sections.neon_sign : "Cover Not Opted",
    plate_glass: hasPlate ? sections.plate_glass : "Cover Not Opted",
  };
}

export interface LocationResult {
  id: string;
  eq_zone: number | null;
  total_si: number;
  non_stock_si: number;
  fire_rate: number | null;
  fire_premium: number | string;
  money_total_si: number;
  money_premium: number | string;
  errors: string[];
}

export interface ProposalResult {
  locations: LocationResult[];
  sections: {
    burglary_si: number;
    burglary_premium: number | string;
    mbd_si: number;
    mbd_premium: number | string;
    plate_glass_si: number;
    plate_glass_premium: number | string;
    neon_sign_si: number;
    neon_sign_premium: number | string;
    public_liability_si: number;
    public_liability_premium: number | string;
    fidelity_si: number;
    fidelity_premium: number | string;
  };
  fire_floater_si: number;
  fire_floater_premium: number | string;
  fire_floater_rate: number | null;
  net_premium: number | string;
  gst: number | string;
  total_premium: number | string;
  referral_required: boolean;
  errors: string[];
}

export function createEmptyLocation(id?: string): LocationInput {
  return {
    id: id ?? crypto.randomUUID(),
    dealer_code: "",
    address: "",
    pincode: "",
    occupancy: "",
    insurance_company: "",
    period_of_cover: "",
    claims_history: "Nil claims in the past 3 years",
    building_si: 0,
    plant_machinery_si: 0,
    furniture_si: 0,
    plate_glass_si: 0,
    neon_sign_si: 0,
    stocks_si: 0,
    money: {
      cover: "Not Opted",
      annual_carrying_limit: 0,
      single_carrying_limit: 0,
      cash_in_safe: 0,
      cash_in_till: 0,
    },
  };
}

export function defaultGlobalSections(): GlobalSections {
  return {
    burglary: "Cover Opted",
    mbd_eei: "Cover Not Opted",
    plate_glass: "Cover Not Opted",
    neon_sign: "Cover Not Opted",
    public_liability: "Cover Opted",
    fidelity: "Cover Not Opted",
    public_liability_si: 0,
    fidelity_employees: 0,
    fidelity_floater_si: 0,
    fidelity_per_employee_limit: 0,
  };
}
