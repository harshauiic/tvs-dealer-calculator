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
}

export interface PincodeRow {
  pincode: string;
  eq_zone: number;
}

export interface LocationMoney {
  cover: MoneyCoverOption;
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
  fire_cover: FireCoverOption;
  building_si: number;
  plant_machinery_si: number;
  furniture_si: number;
  plate_glass_si: number;
  neon_sign_si: number;
  stocks_si: number;
  money: LocationMoney;
}

export interface GlobalSections {
  stock_floater: CoverOption;
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
  locations: LocationInput[];
  sections: GlobalSections;
}

export function defaultProposalInput(): ProposalInput {
  return {
    insured_name: "",
    communication_address: "",
    gstin_number: "",
    hypothecation_1: "",
    hypothecation_2: "",
    hypothecation_3: "",
    locations: [createEmptyLocation()],
    sections: defaultGlobalSections(),
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
    locations: input.locations?.length
      ? input.locations
      : [createEmptyLocation()],
    sections: input.sections ?? defaultGlobalSections(),
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
    public_liability_premium: number | string;
    fidelity_premium: number | string;
  };
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
    fire_cover: "Cover Opted without Terrorism",
    building_si: 0,
    plant_machinery_si: 0,
    furniture_si: 0,
    plate_glass_si: 0,
    neon_sign_si: 0,
    stocks_si: 0,
    money: {
      cover: "Cover Not Opted",
      annual_carrying_limit: 0,
      single_carrying_limit: 0,
      cash_in_safe: 0,
      cash_in_till: 0,
    },
  };
}

export function defaultGlobalSections(): GlobalSections {
  return {
    stock_floater: "Cover Not Opted",
    burglary: "Cover Opted",
    mbd_eei: "Cover Opted",
    plate_glass: "Cover Opted",
    neon_sign: "Cover Not Opted",
    public_liability: "Cover Opted",
    fidelity: "Cover Not Opted",
    public_liability_si: 0,
    fidelity_employees: 0,
    fidelity_floater_si: 0,
    fidelity_per_employee_limit: 0,
  };
}
