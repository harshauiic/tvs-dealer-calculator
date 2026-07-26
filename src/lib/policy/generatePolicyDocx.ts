import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { ProposalInput, ProposalResult } from "../calculator";

export interface PolicyGenerationDetails {
  policyNumber: string;
  previousPolicyNumber: string;
  startDate: string;
  startTime: string;
  endDate: string;
}

const MAX_LOCATIONS = 6;
const COVER_NOT_OPTED = "COVER NOT OPTED";
const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

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

function parseAddressParts(address: string): {
  line: string;
  pincode: string;
  state: string;
} {
  const trimmed = address.trim();
  const pinMatch = trimmed.match(/\b(\d{6})\b/);
  const pincode = pinMatch?.[1] ?? "";
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
  locationCount: number,
): Record<string, string> {
  const locations = input.locations.slice(0, locationCount);
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
    period_from: formatStartPeriod(details.startDate, details.startTime),
    period_to: formatEndPeriod(details.endDate),
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

  for (let i = 1; i <= locationCount; i++) {
    const loc = locations[i - 1];
    data[`loc_label_${i}`] = `Location ${i}`;
    data[`loc_address_${i}`] =
      `${loc.address}${loc.pincode ? ` - ${loc.pincode}` : ""}`;
    data[`loc_occupancy_${i}`] = loc.occupancy || "";

    data[`fire_building_${i}`] = fmtNum(loc.building_si);
    data[`fire_plant_${i}`] = fmtNum(loc.plant_machinery_si);
    data[`fire_furniture_${i}`] = fmtNum(loc.furniture_si);
    data[`fire_plate_${i}`] = fmtNum(loc.plate_glass_si);
    data[`fire_neon_${i}`] = fmtNum(loc.neon_sign_si);
    data[`fire_stocks_${i}`] = input.floater_cover.enabled
      ? "As per floater"
      : fmtNum(loc.stocks_si);
    data[`fire_total_${i}`] = fmtNum(locationTotalSI(loc));

    data[`burglary_si_${i}`] = burglaryOpted
      ? fmtNum(locationTotalSI(loc))
      : COVER_NOT_OPTED;
    data[`mbd_si_${i}`] = mbdOpted
      ? fmtNum(loc.plant_machinery_si)
      : COVER_NOT_OPTED;
    data[`plate_si_${i}`] = plateOpted
      ? fmtNum(loc.plate_glass_si)
      : COVER_NOT_OPTED;

    const moneyOpted = loc.money.cover === "Opted";
    data[`money_annual_${i}`] = moneyOpted
      ? fmtNum(loc.money.annual_carrying_limit)
      : "0";
    data[`money_single_${i}`] = moneyOpted
      ? fmtNum(loc.money.single_carrying_limit)
      : "0";
    data[`money_safe_${i}`] = moneyOpted ? fmtNum(loc.money.cash_in_safe) : "0";
    data[`money_till_${i}`] = moneyOpted ? fmtNum(loc.money.cash_in_till) : "0";
  }

  return data;
}

function localName(node: Element): string {
  return node.localName || node.nodeName.replace(/^.*:/, "");
}

function childrenByLocal(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter((c) => localName(c) === name);
}

function firstByLocal(parent: Element, name: string): Element | null {
  return childrenByLocal(parent, name)[0] ?? null;
}

function deepText(el: Element): string {
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

function setGridSpan(tc: Element, span: number) {
  let tcPr = firstByLocal(tc, "tcPr");
  if (!tcPr) {
    tcPr = tc.ownerDocument!.createElementNS(W_NS, "w:tcPr");
    tc.insertBefore(tcPr, tc.firstChild);
  }
  let gridSpan = firstByLocal(tcPr, "gridSpan");
  if (span <= 1) {
    if (gridSpan) tcPr.removeChild(gridSpan);
    return;
  }
  if (!gridSpan) {
    gridSpan = tc.ownerDocument!.createElementNS(W_NS, "w:gridSpan");
    tcPr.appendChild(gridSpan);
  }
  gridSpan.setAttributeNS(W_NS, "w:val", String(span));
  gridSpan.setAttribute("w:val", String(span));
}

/**
 * Adapt the fixed 6-location template to the actual location count:
 * prune unused risk rows and SI columns, keep boxes closed.
 */
function adaptTemplateForLocations(xml: string, locationCount: number): string {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const tables = Array.from(doc.getElementsByTagNameNS(W_NS, "tbl"));
  if (tables.length < 3) return xml;

  // Risk location table: keep title + header + N location rows
  const riskTable = tables[1];
  const riskRows = childrenByLocal(riskTable, "tr");
  // rows: 0 title, 1 header, 2..7 locations
  for (let i = riskRows.length - 1; i >= 2 + locationCount; i--) {
    riskTable.removeChild(riskRows[i]);
  }

  // SI schedule table: keep section + field + N location columns
  const schedule = tables[2];
  const grid = firstByLocal(schedule, "tblGrid");
  if (grid) {
    const cols = childrenByLocal(grid, "gridCol");
    // keep first 2 label cols + N location cols
    for (let i = cols.length - 1; i >= 2 + locationCount; i--) {
      grid.removeChild(cols[i]);
    }
  }

  for (const row of childrenByLocal(schedule, "tr")) {
    const cells = childrenByLocal(row, "tc");
    if (cells.length >= 8) {
      // normal 8-cell row: drop trailing unused location cells
      for (let i = cells.length - 1; i >= 2 + locationCount; i--) {
        row.removeChild(cells[i]);
      }
    } else if (cells.length === 3) {
      // spanned COVER NOT OPTED style row — span across N location cols
      setGridSpan(cells[2], locationCount);
    }
  }

  // Strip any leftover Rs / rupee markers from headers
  for (const t of Array.from(doc.getElementsByTagNameNS(W_NS, "t"))) {
    if (t.textContent) {
      t.textContent = t.textContent.replace(/\(Rs\)/gi, "").replace(/₹/g, "");
    }
  }

  // Remove garbled concatenated premium paragraphs if any remain
  for (const p of Array.from(doc.getElementsByTagNameNS(W_NS, "p"))) {
    const text = deepText(p);
    if (
      text.includes("Premium:") &&
      text.includes("IGST") &&
      text.includes("Stamp") &&
      text.length > 40
    ) {
      p.parentNode?.removeChild(p);
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

function normalizeDocumentFonts(xml: string): string {
  let out = xml.replace(/w:ascii="[^"]*"/g, 'w:ascii="Calibri"');
  out = out.replace(/w:hAnsi="[^"]*"/g, 'w:hAnsi="Calibri"');
  out = out.replace(/w:cs="[^"]*"/g, 'w:cs="Calibri"');
  // Normalize run font sizes only (w:sz / w:szCs), not table widths
  out = out.replace(
    /(<w:sz(?:Cs)?\b[^>]*\bw:val=")(?:10|11|12|14|16|19)(")/g,
    "$118$2",
  );
  return out;
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
  const locationCount = Math.min(
    Math.max(input.locations.length, 1),
    MAX_LOCATIONS,
  );
  if (input.locations.length > MAX_LOCATIONS) {
    throw new Error(
      `Policy template supports up to ${MAX_LOCATIONS} locations. This proposal has ${input.locations.length}.`,
    );
  }

  const content = await loadTemplateArrayBuffer();
  const zip = new PizZip(content);

  const docXmlPath = "word/document.xml";
  let documentXml = zip.file(docXmlPath)?.asText();
  if (!documentXml) throw new Error("Invalid policy template (missing document.xml)");

  documentXml = adaptTemplateForLocations(documentXml, locationCount);
  documentXml = normalizeDocumentFonts(documentXml);
  // Ensure no rupee glyph sneaks into premium values
  documentXml = documentXml.replace(/₹/g, "");
  zip.file(docXmlPath, documentXml);

  const footerPath = "word/footer1.xml";
  const footerXml = zip.file(footerPath)?.asText();
  if (footerXml) {
    zip.file(footerPath, normalizeDocumentFonts(footerXml));
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
  });

  doc.render(buildTemplateData(input, result, details, locationCount));

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
