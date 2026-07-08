import {
  computeFireRate,
  computeFloaterContextRate,
  findRateRow,
  lookupEqZone,
  resolveFireCover,
  resolveMoneyCover,
  sumPremiums,
} from "./utils";
import type {
  GlobalSections,
  GlobalSettings,
  LocationInput,
  LocationResult,
  PincodeRow,
  ProposalInput,
  ProposalResult,
  RateMasterRow,
} from "./types";

function locationTotalSI(loc: LocationInput): number {
  return (
    loc.building_si +
    loc.plant_machinery_si +
    loc.furniture_si +
    loc.plate_glass_si +
    loc.neon_sign_si +
    loc.stocks_si
  );
}

function locationNonStockSI(loc: LocationInput): number {
  return (
    loc.building_si +
    loc.plant_machinery_si +
    loc.furniture_si +
    loc.plate_glass_si +
    loc.neon_sign_si
  );
}

function isLocationStarted(loc: LocationInput): boolean {
  return (
    Boolean(loc.address.trim()) ||
    loc.pincode.length > 0 ||
    loc.building_si > 0 ||
    loc.plant_machinery_si > 0 ||
    loc.furniture_si > 0 ||
    loc.plate_glass_si > 0 ||
    loc.neon_sign_si > 0 ||
    loc.stocks_si > 0 ||
    loc.money.cover === "Opted"
  );
}

function validateLocationFields(
  loc: LocationInput,
  eqZone: number | null,
): string[] {
  const errors: string[] = [];
  if (!loc.address.trim()) errors.push("Please enter Risk location Address");
  if (!loc.pincode || loc.pincode.length !== 6) errors.push("Please enter valid Pincode");
  if (eqZone === null && loc.pincode.length === 6) {
    errors.push("Please enter correct Pincode above");
  }
  if (!loc.occupancy) errors.push("Select Risk description accordingly");
  if (loc.claims_history === "Select") errors.push("Select Claims detail accordingly");
  const total = locationTotalSI(loc);
  if (total > 500_000_000) errors.push("Location Sum Insured must be less than 50 Crores");
  return errors;
}

function validateLocation(
  loc: LocationInput,
  eqZone: number | null,
  insuredName: string,
  commAddress: string,
): string[] {
  const errors = validateLocationFields(loc, eqZone);
  if (!insuredName.trim()) errors.push("Please enter Insured name");
  if (!commAddress.trim()) errors.push("Please enter Communication Address");
  return errors;
}

function calcLocationFirePremium(
  loc: LocationInput,
  eqZone: number,
  floaterMaxRate: number | null,
  stockFloater: boolean,
  withTerrorism: boolean,
  rateMaster: RateMasterRow[],
  settings: GlobalSettings,
): { premium: number | string; rate: number | null } {
  if (loc.claims_history === "We have claimed in the past 3 years") {
    return { premium: "Kindly refer proposal to office", rate: null };
  }

  const row = findRateRow(loc.occupancy, eqZone, rateMaster);
  if (!row) return { premium: "Invalid occupancy/EQ zone", rate: null };

  const totalSI = locationTotalSI(loc);
  const nonStockSI = locationNonStockSI(loc);
  const locationRate = computeFireRate(row, totalSI, withTerrorism, settings);

  if (stockFloater && floaterMaxRate !== null) {
    const premium =
      (loc.stocks_si * floaterMaxRate + nonStockSI * locationRate) / 1000;
    return { premium, rate: locationRate };
  }

  return { premium: (totalSI * locationRate) / 1000, rate: locationRate };
}

function calcLocationMoneyPremium(
  loc: LocationInput,
  settings: GlobalSettings,
  terrorism: ProposalInput["terrorism"],
): { totalSI: number; premium: number | string } {
  const money = loc.money;
  const effectiveCover = resolveMoneyCover(money.cover, terrorism);
  if (effectiveCover === "Cover Not Opted") {
    return { totalSI: 0, premium: "Cover Not Opted" };
  }
  if (!money.annual_carrying_limit && money.annual_carrying_limit !== 0) {
    return { totalSI: 0, premium: "Please enter Annual carrying limit" };
  }
  if (!money.single_carrying_limit && money.single_carrying_limit !== 0) {
    return { totalSI: 0, premium: "Please enter Single carrying limit" };
  }

  const totalSI =
    money.annual_carrying_limit + money.cash_in_safe + money.cash_in_till;
  const ratePct =
    effectiveCover === "Cover Opted with Terrorism"
      ? settings.money_with_terror_rate_pct
      : settings.money_without_terror_rate_pct;

  return { totalSI, premium: totalSI * (ratePct / 100) };
}

export function calcProposal(
  input: ProposalInput,
  rateMaster: RateMasterRow[],
  pincodes: PincodeRow[] | Map<string, number>,
  settings: GlobalSettings,
): ProposalResult {
  const referralRequired = input.locations.some(
    (l) => l.claims_history === "We have claimed in the past 3 years",
  );

  const stockFloater = input.floater_cover.enabled;
  const withFireTerrorism = resolveFireCover(input.terrorism) === "Cover Opted with Terrorism";

  const floaterRates = input.locations
    .map((loc) => {
      const eqZone = lookupEqZone(loc.pincode, pincodes);
      if (eqZone === null || !loc.occupancy) return null;
      return computeFloaterContextRate(
        loc.occupancy,
        eqZone,
        locationNonStockSI(loc),
        withFireTerrorism,
        rateMaster,
        settings,
      );
    })
    .filter((r): r is number => r !== null);

  const floaterMaxRate =
    floaterRates.length > 0 ? Math.max(...floaterRates) : null;

  const locationResults: LocationResult[] = input.locations.map((loc) => {
    const eqZone = lookupEqZone(loc.pincode, pincodes);
    const errors = validateLocation(
      loc,
      eqZone,
      input.insured_name,
      input.communication_address,
    );
    const fireErrors = validateLocationFields(loc, eqZone);

    let firePremium: number | string = 0;
    let fireRate: number | null = null;

    if (fireErrors.length === 0 && eqZone !== null) {
      const fire = calcLocationFirePremium(
        loc,
        eqZone,
        floaterMaxRate,
        stockFloater,
        withFireTerrorism,
        rateMaster,
        settings,
      );
      firePremium = fire.premium;
      fireRate = fire.rate;
    } else if (isLocationStarted(loc) && fireErrors.length > 0) {
      firePremium = fireErrors[0];
    } else if (isLocationStarted(loc) && eqZone === null && loc.pincode.length === 6) {
      firePremium = "Please enter correct Pincode above";
    }

    const money = calcLocationMoneyPremium(loc, settings, input.terrorism);

    return {
      id: loc.id,
      eq_zone: eqZone,
      total_si: locationTotalSI(loc),
      non_stock_si: locationNonStockSI(loc),
      fire_rate: fireRate,
      fire_premium: firePremium,
      money_total_si: money.totalSI,
      money_premium: money.premium,
      errors: isLocationStarted(loc) ? errors : [],
    };
  });

  const firstValidFire = locationResults.find((l) =>
    typeof l.fire_premium === "number",
  );
  const gate: number | null =
    typeof firstValidFire?.fire_premium === "number" ? firstValidFire.fire_premium : null;

  const totals = input.locations.reduce(
    (acc, loc) => ({
      plant: acc.plant + loc.plant_machinery_si,
      furniture: acc.furniture + loc.furniture_si,
      plate: acc.plate + loc.plate_glass_si,
      neon: acc.neon + loc.neon_sign_si,
      stocks: acc.stocks + loc.stocks_si,
    }),
    { plant: 0, furniture: 0, plate: 0, neon: 0, stocks: 0 },
  );

  const burglarySI =
    input.sections.burglary === "Cover Opted"
      ? totals.plant + totals.furniture + totals.plate + totals.neon + totals.stocks
      : 0;

  const burglaryPremium =
    gate !== null
      ? input.sections.burglary === "Cover Not Opted"
        ? "Cover Not Opted"
        : burglarySI * (settings.burglary_rate_pct / 100)
      : input.sections.burglary === "Cover Not Opted"
        ? "Cover Not Opted"
        : 0;

  const mbdSI = input.sections.mbd_eei === "Cover Opted" ? totals.plant : 0;
  const mbdPremium =
    gate !== null
      ? input.sections.mbd_eei === "Cover Not Opted"
        ? "Cover Not Opted"
        : (mbdSI * settings.mbd_rate_per_thousand) / 1000
      : input.sections.mbd_eei === "Cover Not Opted"
        ? "Cover Not Opted"
        : 0;

  const plateSI = input.sections.plate_glass === "Cover Opted" ? totals.plate : 0;
  const platePremium =
    gate !== null
      ? input.sections.plate_glass === "Cover Not Opted"
        ? "Cover Not Opted"
        : plateSI * (settings.plate_glass_rate_pct / 100)
      : input.sections.plate_glass === "Cover Not Opted"
        ? "Cover Not Opted"
        : 0;

  const neonSI = input.sections.neon_sign === "Cover Opted" ? totals.neon : 0;
  const neonPremium =
    gate !== null
      ? input.sections.neon_sign === "Cover Not Opted"
        ? "Cover Not Opted"
        : neonSI * (settings.neon_sign_rate_pct / 100)
      : input.sections.neon_sign === "Cover Not Opted"
        ? "Cover Not Opted"
        : 0;

  const publicLiabilityPremium = calcSectionPremium(
    gate,
    input.sections.public_liability,
    input.sections.public_liability_si,
    settings.public_liability_rate_pct / 100,
  );

  const fidelityPremium = calcFidelityPremium(gate, input.sections, settings);

  const firePremiums = locationResults.map((l) => l.fire_premium);
  const moneyPremiums = locationResults.map((l) => l.money_premium);

  const allPremiums = [
    ...firePremiums,
    burglaryPremium,
    mbdPremium,
    platePremium,
    neonPremium,
    publicLiabilityPremium,
    fidelityPremium,
    ...moneyPremiums,
  ];

  const hasBlocker = allPremiums.some(
    (p) => typeof p === "string" && p !== "Cover Not Opted",
  );

  const netPremium = hasBlocker
    ? (allPremiums.find(
        (p) => typeof p === "string" && p !== "Cover Not Opted",
      ) ?? "Invalid input")
    : sumPremiums(allPremiums);

  const gst =
    typeof netPremium === "number"
      ? netPremium * (settings.gst_rate_pct / 100)
      : netPremium;

  const totalPremium =
    typeof netPremium === "number" && typeof gst === "number"
      ? netPremium + gst
      : netPremium;

  const proposalErrors: string[] = [];
  if (!input.insured_name.trim()) proposalErrors.push("Please enter Insured name");
  if (!input.communication_address.trim()) {
    proposalErrors.push("Please enter Communication Address");
  }

  const locationErrors = locationResults.flatMap((l) =>
    l.errors.filter(
      (e) =>
        e !== "Please enter Insured name" &&
        e !== "Please enter Communication Address",
    ),
  );

  return {
    locations: locationResults,
    sections: {
      burglary_si: burglarySI,
      burglary_premium: burglaryPremium,
      mbd_si: mbdSI,
      mbd_premium: mbdPremium,
      plate_glass_si: plateSI,
      plate_glass_premium: platePremium,
      neon_sign_si: neonSI,
      neon_sign_premium: neonPremium,
      public_liability_premium: publicLiabilityPremium,
      fidelity_premium: fidelityPremium,
    },
    net_premium: netPremium,
    gst,
    total_premium: totalPremium,
    referral_required: referralRequired,
    errors: [...new Set([...proposalErrors, ...locationErrors])],
  };
}

function calcSectionPremium(
  gate: number | null,
  cover: GlobalSections["burglary"],
  si: number,
  rate: number,
): number | string {
  if (cover === "Cover Not Opted") return "Cover Not Opted";
  if (gate === null) return 0;
  return si * rate;
}

function calcFidelityPremium(
  gate: number | null,
  sections: GlobalSections,
  settings: GlobalSettings,
): number | string {
  if (sections.fidelity === "Cover Not Opted") return "Cover Not Opted";
  if (gate === null) return 0;
  if (!sections.fidelity_employees) return "Please enter no of permanent employees";
  if (!sections.fidelity_floater_si) return "Please enter Floater SI";
  if (!sections.fidelity_per_employee_limit)
    return "Please enter Per employee limit";
  return sections.fidelity_floater_si * (settings.fidelity_rate_pct / 100);
}
