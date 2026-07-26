import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ProposalInput, ProposalResult } from "../calculator";

export interface PolicyGenerationDetails {
  policyNumber: string;
  previousPolicyNumber: string;
  startDate: string; // yyyy-mm-dd
  startTime: string; // HH:mm
  endDate: string; // yyyy-mm-dd
}

const THIN = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };

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

function p(text: string, opts?: { bold?: boolean; size?: number; center?: boolean }) {
  return new Paragraph({
    alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: opts?.size ?? 18,
        font: "Calibri",
      }),
    ],
  });
}

function cell(
  text: string,
  opts?: { bold?: boolean; width?: number; span?: number; center?: boolean },
) {
  return new TableCell({
    borders: BORDERS,
    columnSpan: opts?.span,
    width: { size: opts?.width ?? 1200, type: WidthType.DXA },
    children: [
      new Paragraph({
        alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: opts?.bold,
            size: 16,
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
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

function coverLabel(opted: boolean, value?: string | number): string {
  if (!opted) return "COVER NOT OPTED";
  if (value === undefined || value === "") return "COVER NOT OPTED";
  if (typeof value === "number") return fmtNum(value);
  return value;
}

export async function downloadPolicyDocx(
  input: ProposalInput,
  result: ProposalResult,
  details: PolicyGenerationDetails,
): Promise<void> {
  const locations = input.locations;
  const locCount = Math.max(locations.length, 1);
  const colWidth = Math.floor(6500 / locCount);
  const labelWidth = 2200;
  const subWidth = 1800;

  const startText = formatStartPeriod(details.startDate, details.startTime);
  const endText = formatEndPeriod(details.endDate);
  const insuredLine = input.gstin_number
    ? `${input.insured_name} / ${input.gstin_number}`
    : input.insured_name;

  const net =
    typeof result.net_premium === "number" ? result.net_premium : 0;
  const gst = typeof result.gst === "number" ? result.gst : 0;
  const stampDuty = 1;
  const total = net + gst + stampDuty;

  const headerRows = [
    p("UNITED INDIA INSURANCE COMPANY LIMITED", { bold: true, center: true, size: 24 }),
    p("FAGUN CHAMBERS, NO. 1 & 2, II FLOOR, 26A, ETHIRAJ SALAI,", {
      center: true,
      size: 16,
    }),
    p("EGMORE, CHENNAI 600008 TAMIL NADU", { center: true, size: 16 }),
    p("PHONE: (044) 25384955", { center: true, size: 16 }),
    p(
      `SPECIAL CONTINGENCY POLICY  POLICY NO.:${details.policyNumber}  UIN NO.IRDAN545RP0297V01200708`,
      { bold: true, center: true, size: 18 },
    ),
    p(`PERIOD OF INSURANCE From ${startText} To ${endText}`, {
      bold: true,
      center: true,
      size: 18,
    }),
    p(""),
    p("Insured", { bold: true }),
    p(input.insured_name.toUpperCase(), { bold: true, size: 20 }),
    p(input.communication_address || "-"),
    p(""),
    p("Agent Name: HARITA INSURANCE BROKING LLP", { size: 16 }),
    p("Agent Code: BRC0000921", { size: 16 }),
    p(
      'The genuineness of the policy can be verified through "Verify Your Policy" link at www.uiic.co.in.',
      { size: 14 },
    ),
    p(
      "For any Information, Service Requests, Claim intimation and Grievances please write to 013100@uiic.co.in",
      { size: 14 },
    ),
    p(
      "Download Customer App (www.uiic.co.in). REGD. & HEAD OFFICE, 24, WHITES ROAD, CHENNAI - 600014.",
      { size: 14 },
    ),
    p("Website: http://www.uiic.co.in", { size: 14 }),
    p(""),
    p("SPECIAL CONTINGENCY POLICY SCHEDULE", {
      bold: true,
      center: true,
      size: 22,
    }),
    p(""),
  ];

  const metaTable = new Table({
    width: { size: 10000, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          cell("Policy Number", { bold: true, width: 2200 }),
          cell(details.policyNumber, { width: 2800 }),
          cell("Previous Policy No", { bold: true, width: 2200 }),
          cell(details.previousPolicyNumber || "", { width: 2800 }),
        ],
      }),
      new TableRow({
        children: [
          cell("Insured Details", { bold: true, width: 2200 }),
          cell(insuredLine, { width: 7800, span: 3 }),
        ],
      }),
      new TableRow({
        children: [
          cell("Period Of Insurance", { bold: true, width: 2200 }),
          cell(`From ${startText}`, { width: 3900, span: 1 }),
          cell(`To ${endText}`, { width: 3900, span: 2 }),
        ],
      }),
    ],
  });

  const riskHeader = new TableRow({
    children: [
      cell("", { width: labelWidth }),
      cell("Risk location address", { bold: true, width: 5000 }),
      cell("Occupancy", { bold: true, width: 2800 }),
    ],
  });
  const riskRows = locations.map(
    (loc, i) =>
      new TableRow({
        children: [
          cell(`Location ${i + 1}`, { bold: true, width: labelWidth }),
          cell(
            `${loc.address}${loc.pincode ? ` - ${loc.pincode}` : ""}`,
            { width: 5000 },
          ),
          cell(loc.occupancy || "-", { width: 2800 }),
        ],
      }),
  );
  const riskTable = new Table({
    width: { size: 10000, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          cell("Risk Location details", {
            bold: true,
            width: 10000,
            span: 3,
            center: true,
          }),
        ],
      }),
      riskHeader,
      ...riskRows,
    ],
  });

  const locHeaders = locations.map((_, i) =>
    cell(`Location ${i + 1} (Rs)`, {
      bold: true,
      width: colWidth,
      center: true,
    }),
  );

  function siRow(label: string, values: Array<string | number>, section?: string) {
    return new TableRow({
      children: [
        cell(section ?? "", { bold: Boolean(section), width: labelWidth }),
        cell(label, { width: subWidth }),
        ...values.map((v) =>
          cell(typeof v === "number" ? fmtNum(v) : v, {
            width: colWidth,
            center: true,
          }),
        ),
      ],
    });
  }

  function singleValueRow(section: string, label: string, value: string) {
    return new TableRow({
      children: [
        cell(section, { bold: true, width: labelWidth }),
        cell(label, { width: subWidth }),
        cell(value, { width: colWidth * locCount, span: locCount, center: true }),
      ],
    });
  }

  const fireFloater = input.floater_cover.enabled
    ? fmtNum(input.floater_cover.floater_sum_insured)
    : "COVER NOT OPTED";
  const terrorism = input.terrorism.opted ? "COVER OPTED" : "COVER NOT OPTED";

  const burglaryOpted = input.sections.burglary === "Cover Opted";
  const mbdOpted = input.sections.mbd_eei === "Cover Opted";
  const plateOpted = input.sections.plate_glass === "Cover Opted";
  const neonOpted = input.sections.neon_sign === "Cover Opted";
  const plOpted = input.sections.public_liability === "Cover Opted";
  const fidelityOpted = input.sections.fidelity === "Cover Opted";

  const scheduleRows: TableRow[] = [
    new TableRow({
      children: [
        cell("", { width: labelWidth }),
        cell("", { width: subWidth }),
        ...locHeaders,
      ],
    }),
    siRow(
      "Building SI",
      locations.map((l) => l.building_si),
      "Section 1 - Fire",
    ),
    siRow(
      "Plant and machinery SI",
      locations.map((l) => l.plant_machinery_si),
    ),
    siRow(
      "Furniture Fixtures SI",
      locations.map((l) => l.furniture_si),
    ),
    siRow(
      "Plate glass SI",
      locations.map((l) => l.plate_glass_si),
    ),
    siRow(
      "Neon sign SI",
      locations.map((l) => l.neon_sign_si),
    ),
    siRow(
      "Stocks SI",
      locations.map((l) =>
        input.floater_cover.enabled ? "As per floater" : l.stocks_si,
      ),
    ),
    siRow(
      "Total SI",
      locations.map((l) => locationTotalSI(l)),
    ),
    singleValueRow("Section 1 - Fire", "Fire Floater", fireFloater),
    singleValueRow("Section 1 - Fire", "Terrorism", terrorism),
    burglaryOpted
      ? siRow(
          "Sum Insured",
          locations.map((l) => locationTotalSI(l)),
          "Section 2 – Burglary (as covered under fire section)",
        )
      : singleValueRow(
          "Section 2 – Burglary",
          "Sum Insured",
          "COVER NOT OPTED",
        ),
    mbdOpted
      ? siRow(
          "Sum Insured",
          locations.map((l) => l.plant_machinery_si),
          "Section 3 – MBD/EEI",
        )
      : singleValueRow("Section 3 – MBD/EEI", "Sum Insured", "COVER NOT OPTED"),
    plateOpted
      ? siRow(
          "Sum Insured",
          locations.map((l) => l.plate_glass_si),
          "Section 4 – Plate glass",
        )
      : singleValueRow(
          "Section 4 – Plate glass",
          "Sum Insured",
          "COVER NOT OPTED",
        ),
    neonOpted
      ? siRow(
          "Sum Insured",
          locations.map((l) => l.neon_sign_si),
          "Section 5 – Neon sign",
        )
      : singleValueRow("Section 5 – Neon sign", "Sum Insured", "COVER NOT OPTED"),
    singleValueRow(
      "Section 6 – Public liability",
      "Sum Insured",
      coverLabel(plOpted, input.sections.public_liability_si),
    ),
    singleValueRow(
      "Section 7 - Fidelity",
      "No of permanent employees",
      coverLabel(fidelityOpted, input.sections.fidelity_employees),
    ),
    singleValueRow(
      "Section 7 - Fidelity",
      "Floater SI",
      coverLabel(fidelityOpted, input.sections.fidelity_floater_si),
    ),
    singleValueRow(
      "Section 7 - Fidelity",
      "Per employee limit",
      coverLabel(fidelityOpted, input.sections.fidelity_per_employee_limit),
    ),
    siRow(
      "Annual Carrying limit",
      locations.map((l) =>
        l.money.cover === "Opted" ? l.money.annual_carrying_limit : 0,
      ),
      "Section 8 – Money In transit",
    ),
    siRow(
      "Single carrying limit",
      locations.map((l) =>
        l.money.cover === "Opted" ? l.money.single_carrying_limit : 0,
      ),
    ),
    siRow(
      "Cash in safe",
      locations.map((l) => (l.money.cover === "Opted" ? l.money.cash_in_safe : 0)),
    ),
    siRow(
      "Cash in till",
      locations.map((l) => (l.money.cover === "Opted" ? l.money.cash_in_till : 0)),
    ),
    singleValueRow("Section 8 – Money In transit", "Terrorism", terrorism),
  ];

  const scheduleTable = new Table({
    width: { size: 10000, type: WidthType.DXA },
    rows: scheduleRows,
  });

  const deductibleRows = (
    [
      ["Fire Section", "5% of the claim amount subject to min. Rs. 10,000/-"],
      ["Burglary Section", "5% of the claim amount subject to min. Rs. 5000/-"],
      ["Money Section", "5% of the claim amount subject to min. Rs. 5000/-"],
      [
        "Fidelity Guarantee Section",
        "5% of the claim amount subject to min. Rs. 10,000/-",
      ],
      ["Public Liability Section", "0.5% of Indemnity Limit"],
      [
        "MBD",
        "1% of Sum insured of each machine subject to minimum of Rs.2500/-",
      ],
      ["EEI", "5% of the claim amount subject to min. Rs. 2500/-"],
      ["Neon Sign", "5% of the claim amount subject to min. Rs. 5000/-"],
      ["Plate glass", "5% of the claim amount subject to min. Rs. 5000/-"],
    ] as const
  ).map(
    ([label, value]) =>
      new TableRow({
        children: [
          cell(label, { bold: true, width: 3500 }),
          cell(value, { width: 6500 }),
        ],
      }),
  );

  const deductiblesTable = new Table({
    width: { size: 10000, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          cell("Deductibles / Excess", {
            bold: true,
            width: 10000,
            span: 2,
            center: true,
          }),
        ],
      }),
      ...deductibleRows,
    ],
  });

  const premiumTable = new Table({
    width: { size: 4500, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          cell("Premium:", { bold: true, width: 2200 }),
          cell(fmtMoney(net), { width: 2300 }),
        ],
      }),
      new TableRow({
        children: [
          cell("IGST(18%):", { bold: true, width: 2200 }),
          cell(fmtMoney(gst), { width: 2300 }),
        ],
      }),
      new TableRow({
        children: [
          cell("Stamp duty:", { bold: true, width: 2200 }),
          cell(fmtMoney(stampDuty), { width: 2300 }),
        ],
      }),
      new TableRow({
        children: [
          cell("Total:", { bold: true, width: 2200 }),
          cell(fmtMoney(total), { width: 2300 }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          ...headerRows,
          metaTable,
          p(""),
          riskTable,
          p(""),
          scheduleTable,
          p(""),
          deductiblesTable,
          p(""),
          p("Remarks", { bold: true, size: 20 }),
          p(
            "Only Air conditioners are covered under Plant and Machinery Sum Insured of Fire section, Burglary and MBD section",
          ),
          p("Money in transit", { bold: true }),
          p("a. Transit from dealer place to Bank and vice versa"),
          p(
            "b. Cash carrying must be done through an authorized permanent employee of Insured.",
          ),
          p(
            "c. Warranted that cash in transit above 1 lacs is carried through private transport.",
          ),
          p(
            "d. Warranted that keys are not kept in the shop premises after business hours & also the cash lying outside is to be kept in safe after business hours",
          ),
          p("e. Transit of money should take place within 50kms limit only"),
          p(
            "f. Cash Carried in either in briefcase, Boxes, Bags and in any other types of carrying bags",
          ),
          p("g. Proper accounting system is available"),
          p("3) Burglary – Theft and RSMD included"),
          p(""),
          premiumTable,
          p(""),
          p(
            "We hereby declare that though our aggregate turnover in any preceding financial year from 2017-18 onwards is more than the aggregate turnover notified under sub-rule (4) of rule 48, we are not required to prepare an invoice in terms of the provisions of the said sub-rule.",
            { size: 14 },
          ),
          p(""),
          p(
            "Anti Money Laundering Clause:-In the event of a claim under the policy exceeding 1 lakh or a claim for refund of premium exceeding 1 lakh, the insured will comply with the provisions of AML policy of the company. The AML policy is available in all our operating offices as well as Company's web site.",
            { size: 14 },
          ),
          p(""),
          p(
            "LET US JOIN THE FIGHT AGAINST CORRUPTION. PLEASE TAKE THE PLEDGE AT https://pledge.cvc.nic.in.",
            { size: 14 },
          ),
          p(""),
          p("For and On behalf of", { size: 16 }),
          p("United India Insurance Co. Ltd.", { bold: true, size: 18 }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safePolicy = details.policyNumber.replace(/[^\w.-]+/g, "-");
  const safeName = (input.insured_name || "insured").replace(/\s+/g, "-");
  a.download = `SPECIAL-CONTINGENCY-POLICY-${safePolicy}-${safeName}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
