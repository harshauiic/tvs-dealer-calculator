import {
  computeFireRate,
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

/** SI used for under/over 5Cr rate banding when floater cover is opted. */
function locationFloaterBandSI(loc: LocationInput, maxPerLocation: number): number {
  return maxPerLocation + locationNonStockSI(loc);
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

function formatLimit(value: number): string {
  return value.toLocaleString("en-IN");
}

function exceedLimitMessage(fieldLabel: string, value: number, limit: number): string {
  return `${fieldLabel} exceeds maximum limit of ${formatLimit(limit)} (entered ${formatLimit(value)})`;
}

function validateFireFieldLimits(
  loc: LocationInput,
  settings: GlobalSettings,
  locationIndex: number,
  floaterEnabled: boolean,
  maxSumInsuredPerLocation: number,
): string[] {
  const label = `Location ${locationIndex + 1}`;
  const fireSectionsTotal = locationTotalSI(loc);
  const comparedTotal = floaterEnabled
    ? fireSectionsTotal + maxSumInsuredPerLocation
    : fireSectionsTotal;

  if (comparedTotal > settings.max_location_si) {
    const detail = floaterEnabled
      ? `Fire SI fields (${formatLimit(fireSectionsTotal)}) + Maximum sum insured per location (${formatLimit(maxSumInsuredPerLocation)}) = ${formatLimit(comparedTotal)}`
      : `total Fire Sum Insured (${formatLimit(comparedTotal)})`;
    return [
      `${label}: ${detail} exceeds maximum limit of ${formatLimit(settings.max_location_si)}`,
    ];
  }
  return [];
}

function validateMoneyFieldLimits(
  loc: LocationInput,
  settings: GlobalSettings,
  locationIndex: number,
): string[] {
  if (loc.money.cover !== "Opted") return [];
  const label = `Location ${locationIndex + 1}`;
  const money = loc.money;
  const errors: string[] = [];
  const checks: Array<[number, number, string]> = [
    [money.annual_carrying_limit, settings.limit_money_annual_carrying, `${label} Annual Carrying limit`],
    [money.single_carrying_limit, settings.limit_money_single_carrying, `${label} Single carrying limit`],
    [money.cash_in_safe, settings.limit_money_cash_in_safe, `${label} Cash in safe`],
    [money.cash_in_till, settings.limit_money_cash_in_till, `${label} Cash in till`],
  ];
  for (const [value, limit, fieldLabel] of checks) {
    if (value > limit) errors.push(exceedLimitMessage(fieldLabel, value, limit));
  }
  if (
    money.single_carrying_limit > 0 &&
    money.annual_carrying_limit > 0 &&
    money.single_carrying_limit >= money.annual_carrying_limit
  ) {
    errors.push(
      `${label}: Single carrying limit should be less than Annual Carrying limit`,
    );
  }
  return errors;
}

function validateSectionLimits(
  input: ProposalInput,
  settings: GlobalSettings,
): string[] {
  const errors: string[] = [];
  if (input.sections.public_liability === "Cover Opted") {
    if (input.sections.public_liability_si > settings.limit_public_liability_si) {
      errors.push(
        exceedLimitMessage(
          "Public Liability Sum Insured",
          input.sections.public_liability_si,
          settings.limit_public_liability_si,
        ),
      );
    }
  }
  if (input.sections.fidelity === "Cover Opted") {
    if (input.sections.fidelity_employees > settings.limit_fidelity_employees) {
      errors.push(
        exceedLimitMessage(
          "No of permanent employees",
          input.sections.fidelity_employees,
          settings.limit_fidelity_employees,
        ),
      );
    }
    if (input.sections.fidelity_floater_si > settings.limit_fidelity_floater_si) {
      errors.push(
        exceedLimitMessage(
          "Fidelity Floater SI",
          input.sections.fidelity_floater_si,
          settings.limit_fidelity_floater_si,
        ),
      );
    }
    if (input.sections.fidelity_per_employee_limit > settings.limit_fidelity_per_employee) {
      errors.push(
        exceedLimitMessage(
          "Per employee limit",
          input.sections.fidelity_per_employee_limit,
          settings.limit_fidelity_per_employee,
        ),
      );
    }
    if (
      input.sections.fidelity_per_employee_limit > 0 &&
      input.sections.fidelity_floater_si > 0 &&
      input.sections.fidelity_per_employee_limit >= input.sections.fidelity_floater_si
    ) {
      errors.push("Per employee limit should be less than Floater SI");
    }
  }
  return errors;
}

function validateFloaterCover(input: ProposalInput): string[] {
  if (!input.floater_cover.enabled) return [];

  const errors: string[] = [];
  const { floater_sum_insured, max_sum_insured_per_location } = input.floater_cover;

  if (!floater_sum_insured || floater_sum_insured <= 0) {
    errors.push("Please enter Floater sum insured required");
  }
  if (!max_sum_insured_per_location || max_sum_insured_per_location <= 0) {
    errors.push("Please enter Maximum sum insured per location");
  }

  if (
    floater_sum_insured > 0 &&
    max_sum_insured_per_location > 0 &&
    input.locations.length > 0
  ) {
    const minRequired = floater_sum_insured / input.locations.length + 1;
    if (max_sum_insured_per_location < minRequired) {
      const formatted = minRequired.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      });
      errors.push(`Enter the value greater than ${formatted}`);
    }
  }

  return errors;
}

function calcLocationFirePremium(
  loc: LocationInput,
  eqZone: number,
  stockFloater: boolean,
  maxPerLocation: number,
  withTerrorism: boolean,
  rateMaster: RateMasterRow[],
  settings: GlobalSettings,
): { premium: number | string; rate: number | null } {
  if (loc.claims_history === "We have claimed in the past 3 years") {
    return { premium: "Kindly refer proposal to office", rate: null };
  }

  const row = findRateRow(loc.occupancy, eqZone, rateMaster);
  if (!row) return { premium: "Invalid occupancy/EQ zone", rate: null };

  const nonStockSI = locationNonStockSI(loc);
  const siForRate = stockFloater
    ? locationFloaterBandSI(loc, maxPerLocation)
    : locationTotalSI(loc);
  const locationRate = computeFireRate(row, siForRate, withTerrorism, settings);

  if (stockFloater) {
    return { premium: (nonStockSI * locationRate) / 1000, rate: locationRate };
  }

  return { premium: (siForRate * locationRate) / 1000, rate: locationRate };
}

function calcLocationMoneyPremium(
  loc: LocationInput,
  settings: GlobalSettings,
  terrorism: ProposalInput["terrorism"],
  locationIndex: number,
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
  if (
    money.single_carrying_limit > 0 &&
    money.annual_carrying_limit > 0 &&
    money.single_carrying_limit >= money.annual_carrying_limit
  ) {
    return {
      totalSI: 0,
      premium: `Location ${locationIndex + 1}: Single carrying limit should be less than Annual Carrying limit`,
    };
  }

  const limitErrors = validateMoneyFieldLimits(loc, settings, locationIndex);
  if (limitErrors.length > 0) {
    return { totalSI: 0, premium: limitErrors[0] };
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
  const maxPerLocation = input.floater_cover.max_sum_insured_per_location;
  const withFireTerrorism =
    resolveFireCover(input.terrorism) === "Cover Opted with Terrorism";
  const floaterErrors = validateFloaterCover(input);
  const sectionLimitErrors = validateSectionLimits(input, settings);

  const locationResults: LocationResult[] = input.locations.map((loc, index) => {
    const eqZone = lookupEqZone(loc.pincode, pincodes);
    const errors = validateLocation(
      loc,
      eqZone,
      input.insured_name,
      input.communication_address,
    );
    const fireErrors = validateLocationFields(loc, eqZone);
    const fireLimitErrors = validateFireFieldLimits(
      loc,
      settings,
      index,
      stockFloater,
      maxPerLocation,
    );

    let firePremium: number | string = 0;
    let fireRate: number | null = null;

    if (fireLimitErrors.length > 0) {
      firePremium = fireLimitErrors[0];
    } else if (fireErrors.length === 0 && eqZone !== null) {
      const fire = calcLocationFirePremium(
        loc,
        eqZone,
        stockFloater,
        maxPerLocation,
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

    const money = calcLocationMoneyPremium(loc, settings, input.terrorism, index);

    return {
      id: loc.id,
      eq_zone: eqZone,
      total_si: locationTotalSI(loc),
      non_stock_si: locationNonStockSI(loc),
      fire_rate: fireRate,
      fire_premium: firePremium,
      money_total_si: money.totalSI,
      money_premium: money.premium,
      errors: isLocationStarted(loc)
        ? [...errors, ...fireLimitErrors, ...validateMoneyFieldLimits(loc, settings, index)]
        : [],
    };
  });

  const locationRates = locationResults
    .map((l) => l.fire_rate)
    .filter((r): r is number => r !== null);
  const highestLocationRate =
    locationRates.length > 0 ? Math.max(...locationRates) : null;

  let fireFloaterPremium: number | string = 0;
  if (stockFloater) {
    if (floaterErrors.length > 0) {
      fireFloaterPremium = floaterErrors[0];
    } else if (highestLocationRate !== null) {
      fireFloaterPremium =
        (input.floater_cover.floater_sum_insured * highestLocationRate) / 1000;
    }
  }

  const firstValidFire = locationResults.find((l) =>
    typeof l.fire_premium === "number",
  );
  const gate: number | null =
    typeof firstValidFire?.fire_premium === "number"
      ? firstValidFire.fire_premium
      : typeof fireFloaterPremium === "number" && fireFloaterPremium > 0
        ? fireFloaterPremium
        : null;

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

  const floaterSIForBurglary =
    stockFloater && floaterErrors.length === 0
      ? input.floater_cover.floater_sum_insured
      : 0;

  const burglarySI =
    input.sections.burglary === "Cover Opted"
      ? totals.plant +
        totals.furniture +
        totals.plate +
        totals.neon +
        totals.stocks +
        floaterSIForBurglary
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

  const publicLiabilityPremium =
    sectionLimitErrors.find((e) => e.startsWith("Public Liability")) ??
    calcSectionPremium(
      gate,
      input.sections.public_liability,
      input.sections.public_liability_si,
      settings.public_liability_rate_pct / 100,
    );

  const fidelityPremium =
    sectionLimitErrors.find(
      (e) =>
        e.startsWith("Fidelity") ||
        e.startsWith("No of permanent") ||
        e.startsWith("Per employee") ||
        e.includes("Floater SI"),
    ) ?? calcFidelityPremium(gate, input.sections, settings);

  const firePremiums = locationResults.map((l) => l.fire_premium);
  const moneyPremiums = locationResults.map((l) => l.money_premium);

  const allPremiums = [
    ...firePremiums,
    ...(stockFloater ? [fireFloaterPremium] : []),
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

  const proposalErrors: string[] = [
    ...floaterErrors,
    ...sectionLimitErrors,
  ];
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
      public_liability_si:
        input.sections.public_liability === "Cover Opted"
          ? input.sections.public_liability_si
          : 0,
      public_liability_premium: publicLiabilityPremium,
      fidelity_si:
        input.sections.fidelity === "Cover Opted"
          ? input.sections.fidelity_floater_si
          : 0,
      fidelity_premium: fidelityPremium,
    },
    fire_floater_si: stockFloater ? input.floater_cover.floater_sum_insured : 0,
    fire_floater_premium: stockFloater ? fireFloaterPremium : "Cover Not Opted",
    fire_floater_rate: stockFloater ? highestLocationRate : null,
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
  if (
    sections.fidelity_per_employee_limit > 0 &&
    sections.fidelity_floater_si > 0 &&
    sections.fidelity_per_employee_limit >= sections.fidelity_floater_si
  ) {
    return "Per employee limit should be less than Floater SI";
  }
  return sections.fidelity_floater_si * (settings.fidelity_rate_pct / 100);
}
