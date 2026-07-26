import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { ProposalInput, ProposalResult } from "../calculator";

export interface PolicyGenerationDetails {
  policyNumber: string;
  previousPolicyNumber: string;
  startDate: string; // yyyy-mm-dd
  startTime: string; // HH:mm
  endDate: string; // yyyy-mm-dd
}

const MAX_LOCATIONS = 6;
const COVER_NOT_OPTED = "COVER NOT OPTED";

function fmtNum(value: number): string {
  return Math.round(value).toLocaleString("en-IN");
}

function fmtMoney(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function formatStartPeriod(date: string, time: string): string {
  return `${time} Hrs of ${formatDisplayDate(date)}`;
}

function formatEndPeriod(date: string): string {
  return `Midnight of ${formatDisplayDate(date)}`;
}

function formatStartPeriodLower(date: string, time: string): string {
  return `${time} hrs of ${formatDisplayDate(date)}`;
}

function formatEndPeriodLower(date: string): string {
  return `midnight of ${formatDisplayDate(date)}`;
}

function locationTotalSI(loc: ProposalInput["locations"][0]): number {
  return (
    loc.building_si +
    loc.plant_machinery_si +
    loc.furniture_si +
    loc.plate_glass_si +
    loc.neon_sign_si +
    loc.stocks_si
  );
}

function coverOrAmount(opted: boolean, value: number): string {
  if (!opted) return COVER_NOT_OPTED;
  return fmtNum(value);
}

function coverOrCount(opted: boolean, value: number): string {
  if (!opted) return COVER_NOT_OPTED;
  return String(Math.round(value));
}

function amountOrBlank(hasLocation: boolean, value: number): string {
  if (!hasLocation) return "";
  return fmtNum(value);
}

function parseAddressParts(address: string): {
  line: string;
  pincode: string;
  state: string;
} {
  const trimmed = address.trim();
  const pinMatch = trimmed.match(/\b(\d{6})\b/);
  const pincode = pinMatch?.[1] ?? "";
  // Heuristic: last comma-separated token that looks like a state name
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const state =
    /pradesh|nadu|bengal|rashtra|gujarat|rajasthan|karnataka|kerala|odisha|delhi|punjab|haryana|bihar|jharkhand|assam|goa|manipur|meghalaya|mizoram|nagaland|sikkim|tripura|chandigarh|puducherry|india/i.test(
      last,
    ) && !/\d/.test(last)
      ? last
      : "";
  return { line: trimmed, pincode, state };
}

function buildTemplateData(
  input: ProposalInput,
  result: ProposalResult,
  details: PolicyGenerationDetails,
): Record<string, string> {
  const locations = input.locations.slice(0, MAX_LOCATIONS);
  const periodFrom = formatStartPeriod(details.startDate, details.startTime);
  const periodTo = formatEndPeriod(details.endDate);
  const addr = parseAddressParts(input.communication_address || "");

  const net = typeof result.net_premium === "number" ? result.net_premium : 0;
  const gst = typeof result.gst === "number" ? result.gst : 0;
  const stampDuty = 1;
  const total = net + gst + stampDuty;

  const burglaryOpted = input.sections.burglary === "Cover Opted";
  const mbdOpted = input.sections.mbd_eei === "Cover Opted";
  const plateOpted = input.sections.plate_glass === "Cover Opted";
  const neonOpted = input.sections.neon_sign === "Cover Opted";
  const plOpted = input.sections.public_liability === "Cover Opted";
  const fidelityOpted = input.sections.fidelity === "Cover Opted";
  const terrorism = input.terrorism.opted ? "COVER OPTED" : COVER_NOT_OPTED;
  const fireFloater = input.floater_cover.enabled
    ? fmtNum(input.floater_cover.floater_sum_insured)
    : COVER_NOT_OPTED;

  const data: Record<string, string> = {
    policy_number: details.policyNumber,
    previous_policy_number: details.previousPolicyNumber || "",
    insured_name: (input.insured_name || "").toUpperCase(),
    insured_address: addr.line || input.communication_address || "",
    insured_pincode: addr.pincode,
    insured_state: addr.state,
    insured_details: input.gstin_number
      ? `${input.insured_name} / ${input.gstin_number}`
      : input.insured_name,
    period_from: periodFrom,
    period_to: periodTo,
    period_from_lower: formatStartPeriodLower(
      details.startDate,
      details.startTime,
    ),
    period_to_lower: formatEndPeriodLower(details.endDate),
    fire_floater: fireFloater,
    terrorism,
    neon_section: neonOpted
      ? fmtNum(locations.reduce((sum, loc) => sum + loc.neon_sign_si, 0))
      : COVER_NOT_OPTED,
    public_liability_si: coverOrAmount(
      plOpted,
      input.sections.public_liability_si,
    ),
    fidelity_employees: coverOrCount(
      fidelityOpted,
      input.sections.fidelity_employees,
    ),
    fidelity_floater: coverOrAmount(
      fidelityOpted,
      input.sections.fidelity_floater_si,
    ),
    fidelity_per_employee: coverOrAmount(
      fidelityOpted,
      input.sections.fidelity_per_employee_limit,
    ),
    money_terrorism: terrorism,
    premium: fmtMoney(net),
    igst: fmtMoney(gst),
    stamp_duty: fmtMoney(stampDuty),
    total: fmtMoney(total),
  };

  for (let i = 1; i <= MAX_LOCATIONS; i++) {
    const loc = locations[i - 1];
    const has = Boolean(loc);
    data[`loc_label_${i}`] = has ? `Location ${i}` : "";
    data[`loc_address_${i}`] = has
      ? `${loc.address}${loc.pincode ? ` - ${loc.pincode}` : ""}`
      : "";
    data[`loc_occupancy_${i}`] = has ? loc.occupancy || "" : "";

    data[`fire_building_${i}`] = amountOrBlank(has, loc?.building_si ?? 0);
    data[`fire_plant_${i}`] = amountOrBlank(has, loc?.plant_machinery_si ?? 0);
    data[`fire_furniture_${i}`] = amountOrBlank(has, loc?.furniture_si ?? 0);
    data[`fire_plate_${i}`] = amountOrBlank(has, loc?.plate_glass_si ?? 0);
    data[`fire_neon_${i}`] = amountOrBlank(has, loc?.neon_sign_si ?? 0);
    data[`fire_stocks_${i}`] = has
      ? input.floater_cover.enabled
        ? "As per floater"
        : fmtNum(loc.stocks_si)
      : "";
    data[`fire_total_${i}`] = has ? fmtNum(locationTotalSI(loc)) : "";

    data[`burglary_si_${i}`] = has
      ? burglaryOpted
        ? fmtNum(locationTotalSI(loc))
        : COVER_NOT_OPTED
      : "";
    data[`mbd_si_${i}`] = has
      ? mbdOpted
        ? fmtNum(loc.plant_machinery_si)
        : COVER_NOT_OPTED
      : "";
    data[`plate_si_${i}`] = has
      ? plateOpted
        ? fmtNum(loc.plate_glass_si)
        : COVER_NOT_OPTED
      : "";

    const moneyOpted = has && loc.money.cover === "Opted";
    data[`money_annual_${i}`] = moneyOpted
      ? fmtNum(loc.money.annual_carrying_limit)
      : has
        ? "0"
        : "";
    data[`money_single_${i}`] = moneyOpted
      ? fmtNum(loc.money.single_carrying_limit)
      : has
        ? "0"
        : "";
    data[`money_safe_${i}`] = moneyOpted
      ? fmtNum(loc.money.cash_in_safe)
      : has
        ? "0"
        : "";
    data[`money_till_${i}`] = moneyOpted
      ? fmtNum(loc.money.cash_in_till)
      : has
        ? "0"
        : "";
  }

  // When burglary/mbd/plate not opted, template has per-location cells — fill all with COVER NOT OPTED
  if (!burglaryOpted) {
    for (let i = 1; i <= MAX_LOCATIONS; i++) {
      if (locations[i - 1]) data[`burglary_si_${i}`] = COVER_NOT_OPTED;
    }
  }
  if (!mbdOpted) {
    for (let i = 1; i <= MAX_LOCATIONS; i++) {
      if (locations[i - 1]) data[`mbd_si_${i}`] = COVER_NOT_OPTED;
    }
  }
  if (!plateOpted) {
    for (let i = 1; i <= MAX_LOCATIONS; i++) {
      if (locations[i - 1]) data[`plate_si_${i}`] = COVER_NOT_OPTED;
    }
  }

  return data;
}

async function loadTemplateArrayBuffer(): Promise<ArrayBuffer> {
  const path = `${import.meta.env.BASE_URL}templates/policyreference.docx`;
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(
      `Could not load policy template (${response.status}). Ensure public/templates/policyreference.docx is deployed.`,
    );
  }
  return response.arrayBuffer();
}

export async function downloadPolicyDocx(
  input: ProposalInput,
  result: ProposalResult,
  details: PolicyGenerationDetails,
): Promise<void> {
  if (input.locations.length > MAX_LOCATIONS) {
    throw new Error(
      `Policy template supports up to ${MAX_LOCATIONS} locations. This proposal has ${input.locations.length}.`,
    );
  }

  const content = await loadTemplateArrayBuffer();
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
  });

  doc.render(buildTemplateData(input, result, details));

  const blob = doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safePolicy = details.policyNumber.replace(/[^\w.-]+/g, "-");
  const safeName = (input.insured_name || "insured").replace(/\s+/g, "-");
  a.download = `SPECIAL-CONTINGENCY-POLICY-${safePolicy}-${safeName}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
