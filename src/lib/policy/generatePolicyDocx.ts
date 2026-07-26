import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
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

/** Usable content width in DXA (A4-ish, matching sample margins). */
const PAGE_WIDTH = 11000;

const THIN = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const FOOTER_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 8, color: "666666" },
  bottom: NONE,
  left: NONE,
  right: NONE,
};

type Align = (typeof AlignmentType)[keyof typeof AlignmentType];

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

function p(
  text: string,
  opts?: { bold?: boolean; size?: number; center?: boolean; spacingAfter?: number },
) {
  return new Paragraph({
    alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: opts?.spacingAfter ?? 60 },
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
  width: number,
  opts?: {
    bold?: boolean;
    span?: number;
    align?: Align;
    fill?: string;
    fontSize?: number;
  },
) {
  return new TableCell({
    borders: BORDERS,
    columnSpan: opts?.span,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: opts?.fill ? { fill: opts.fill } : undefined,
    children: [
      new Paragraph({
        alignment: opts?.align ?? AlignmentType.LEFT,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text,
            bold: opts?.bold,
            size: opts?.fontSize ?? 15,
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

function displayAmount(value: string | number): string {
  return typeof value === "number" ? fmtNum(value) : value;
}

export async function downloadPolicyDocx(
  input: ProposalInput,
  result: ProposalResult,
  details: PolicyGenerationDetails,
): Promise<void> {
  const locations = input.locations;
  const locCount = Math.max(locations.length, 1);

  const sectionW = 1600;
  const fieldW = 1800;
  const locTotalW = PAGE_WIDTH - sectionW - fieldW;
  const locW = Math.floor(locTotalW / locCount);
  const locWidths = Array.from({ length: locCount }, (_, i) =>
    i === locCount - 1 ? locTotalW - locW * (locCount - 1) : locW,
  );
  const scheduleColWidths = [sectionW, fieldW, ...locWidths];

  const riskColWidths = [2400, 5200, 3400];
  const metaColWidths = [2200, 3300, 2200, 3300];
  const deductibleColWidths = [3500, 7500];
  const premiumColWidths = [2200, 2300];

  const startText = formatStartPeriod(details.startDate, details.startTime);
  const endText = formatEndPeriod(details.endDate);
  const insuredLine = input.gstin_number
    ? `${input.insured_name} / ${input.gstin_number}`
    : input.insured_name;

  const net = typeof result.net_premium === "number" ? result.net_premium : 0;
  const gst = typeof result.gst === "number" ? result.gst : 0;
  const stampDuty = 1;
  const total = net + gst + stampDuty;

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

  function siRow(
    label: string,
    values: Array<string | number>,
    section = "",
  ): TableRow {
    return new TableRow({
      children: [
        cell(section, sectionW, { bold: Boolean(section) }),
        cell(label, fieldW),
        ...values.map((v, i) =>
          cell(displayAmount(v), locWidths[i], {
            align:
              typeof v === "number" || /^\d/.test(String(v))
                ? AlignmentType.RIGHT
                : AlignmentType.CENTER,
          }),
        ),
      ],
    });
  }

  /** Label + value spanning all location columns (COVER NOT OPTED style). */
  function spanRow(section: string, label: string, value: string): TableRow {
    return new TableRow({
      children: [
        cell(section, sectionW, { bold: Boolean(section) }),
        cell(label, fieldW),
        cell(value, locTotalW, {
          span: locCount,
          align: AlignmentType.CENTER,
          bold: value === "COVER NOT OPTED",
        }),
      ],
    });
  }

  const headerBlocks = [
    p("UNITED INDIA INSURANCE COMPANY LIMITED", {
      bold: true,
      center: true,
      size: 24,
    }),
    p("FAGUN CHAMBERS, NO. 1 & 2, II FLOOR, 26A, ETHIRAJ SALAI,", {
      center: true,
      size: 16,
    }),
    p("EGMORE, CHENNAI 600008 TAMIL NADU", { center: true, size: 16 }),
    p("PHONE: (044) 25384955", { center: true, size: 16, spacingAfter: 120 }),
    p(
      `SPECIAL CONTINGENCY POLICY  POLICY NO.:${details.policyNumber}  UIN NO.IRDAN545RP0297V01200708`,
      { bold: true, center: true, size: 17 },
    ),
    p("PERIOD OF INSURANCE", { bold: true, center: true, size: 18 }),
    p(`From ${startText} To ${endText}`, {
      bold: true,
      center: true,
      size: 17,
      spacingAfter: 160,
    }),
    p("Insured", { bold: true, center: true, size: 18 }),
    p(input.insured_name.toUpperCase(), {
      bold: true,
      center: true,
      size: 20,
    }),
    p(input.communication_address || "-", { center: true, size: 16 }),
    p(""),
    p("Agent Name: HARITA INSURANCE BROKING LLP", { size: 15 }),
    p("Agent Code: BRC0000921", { size: 15 }),
    p(
      'The genuineness of the policy can be verified through "Verify Your Policy" link at www.uiic.co.in.',
      { size: 13 },
    ),
    p(
      "For any Information, Service Requests, Claim intimation and Grievances please write to 013100@uiic.co.in",
      { size: 13 },
    ),
    p(
      "Download Customer App (www.uiic.co.in). REGD. & HEAD OFFICE, 24, WHITES ROAD, CHENNAI - 600014.",
      { size: 13 },
    ),
    p("Website: http://www.uiic.co.in", { size: 13, spacingAfter: 160 }),
    p("SPECIAL CONTINGENCY POLICY SCHEDULE", {
      bold: true,
      center: true,
      size: 22,
      spacingAfter: 120,
    }),
  ];

  const metaTable = new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: metaColWidths,
    rows: [
      new TableRow({
        children: [
          cell("Policy Number", metaColWidths[0], {
            bold: true,
            fill: "DCE6F1",
          }),
          cell(details.policyNumber, metaColWidths[1]),
          cell("Previous Policy No", metaColWidths[2], {
            bold: true,
            fill: "DCE6F1",
          }),
          cell(details.previousPolicyNumber || " ", metaColWidths[3]),
        ],
      }),
      new TableRow({
        children: [
          cell("Insured Details", metaColWidths[0], {
            bold: true,
            fill: "DCE6F1",
          }),
          cell(insuredLine, metaColWidths[1] + metaColWidths[2] + metaColWidths[3], {
            span: 3,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell("Period Of Insurance", metaColWidths[0], {
            bold: true,
            fill: "DCE6F1",
          }),
          cell(`From ${startText}`, metaColWidths[1]),
          cell("To", metaColWidths[2], {
            bold: true,
            align: AlignmentType.CENTER,
            fill: "DCE6F1",
          }),
          cell(endText, metaColWidths[3]),
        ],
      }),
    ],
  });

  const riskTable = new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: riskColWidths,
    rows: [
      new TableRow({
        children: [
          cell("Risk Location details", PAGE_WIDTH, {
            bold: true,
            span: 3,
            align: AlignmentType.CENTER,
            fill: "DCE6F1",
            fontSize: 16,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell(" ", riskColWidths[0], { fill: "F2F2F2" }),
          cell("Risk location address", riskColWidths[1], {
            bold: true,
            fill: "F2F2F2",
          }),
          cell("Occupancy", riskColWidths[2], { bold: true, fill: "F2F2F2" }),
        ],
      }),
      ...locations.map(
        (loc, i) =>
          new TableRow({
            children: [
              cell(`Location ${i + 1}`, riskColWidths[0], { bold: true }),
              cell(
                `${loc.address}${loc.pincode ? ` - ${loc.pincode}` : ""}`,
                riskColWidths[1],
              ),
              cell(loc.occupancy || "-", riskColWidths[2]),
            ],
          }),
      ),
    ],
  });

  const scheduleRows: TableRow[] = [
    new TableRow({
      children: [
        cell(" ", sectionW, { fill: "F2F2F2" }),
        cell(" ", fieldW, { fill: "F2F2F2" }),
        ...locations.map((_, i) =>
          cell(`Location ${i + 1} (Rs)`, locWidths[i], {
            bold: true,
            align: AlignmentType.CENTER,
            fill: "F2F2F2",
          }),
        ),
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
    spanRow("", "Fire Floater", fireFloater),
    spanRow("", "Terrorism", terrorism),
    burglaryOpted
      ? siRow(
          "Sum Insured",
          locations.map((l) => locationTotalSI(l)),
          "Section 2 – Burglary (as covered under fire section)",
        )
      : spanRow("Section 2 – Burglary", "Sum Insured", "COVER NOT OPTED"),
    mbdOpted
      ? siRow(
          "Sum Insured",
          locations.map((l) => l.plant_machinery_si),
          "Section 3 – MBD/EEI",
        )
      : spanRow("Section 3 – MBD/EEI", "Sum Insured", "COVER NOT OPTED"),
    plateOpted
      ? siRow(
          "Sum Insured",
          locations.map((l) => l.plate_glass_si),
          "Section 4 – Plate glass",
        )
      : spanRow("Section 4 – Plate glass", "Sum Insured", "COVER NOT OPTED"),
    neonOpted
      ? siRow(
          "Sum Insured",
          locations.map((l) => l.neon_sign_si),
          "Section 5 – Neon sign",
        )
      : spanRow("Section 5 – Neon sign", "Sum Insured", "COVER NOT OPTED"),
    spanRow(
      "Section 6 – Public liability",
      "Sum Insured",
      coverLabel(plOpted, input.sections.public_liability_si),
    ),
    spanRow(
      "Section 7 - Fidelity",
      "No of permanent employees",
      coverLabel(fidelityOpted, input.sections.fidelity_employees),
    ),
    spanRow(
      "",
      "Floater SI",
      coverLabel(fidelityOpted, input.sections.fidelity_floater_si),
    ),
    spanRow(
      "",
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
    spanRow("", "Terrorism", terrorism),
  ];

  const scheduleTable = new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: scheduleColWidths,
    rows: scheduleRows,
  });

  const deductiblesTable = new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: deductibleColWidths,
    rows: [
      new TableRow({
        children: [
          cell("Deductibles / Excess", PAGE_WIDTH, {
            bold: true,
            span: 2,
            align: AlignmentType.CENTER,
            fill: "DCE6F1",
            fontSize: 16,
          }),
        ],
      }),
      ...(
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
              cell(label, deductibleColWidths[0], { bold: true }),
              cell(value, deductibleColWidths[1]),
            ],
          }),
      ),
    ],
  });

  const premiumTable = new Table({
    width: { size: premiumColWidths[0] + premiumColWidths[1], type: WidthType.DXA },
    columnWidths: premiumColWidths,
    rows: (
      [
        ["Premium:", fmtMoney(net)],
        ["IGST(18%):", fmtMoney(gst)],
        ["Stamp duty:", fmtMoney(stampDuty)],
        ["Total:", fmtMoney(total)],
      ] as const
    ).map(
      ([label, value]) =>
        new TableRow({
          children: [
            cell(label, premiumColWidths[0], { bold: true, fill: "F2F2F2" }),
            cell(value, premiumColWidths[1], { align: AlignmentType.RIGHT }),
          ],
        }),
    ),
  });

  const footer = new Footer({
    children: [
      new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [Math.floor(PAGE_WIDTH * 0.62), Math.floor(PAGE_WIDTH * 0.38)],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: FOOTER_BORDERS,
                width: {
                  size: Math.floor(PAGE_WIDTH * 0.62),
                  type: WidthType.DXA,
                },
                children: [
                  new Paragraph({
                    spacing: { before: 80 },
                    children: [
                      new TextRun({
                        text: `Policy No.: ${details.policyNumber}`,
                        size: 16,
                        font: "Calibri",
                        bold: true,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders: FOOTER_BORDERS,
                width: {
                  size: Math.floor(PAGE_WIDTH * 0.38),
                  type: WidthType.DXA,
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 80 },
                    children: [
                      new TextRun({
                        text: "Page ",
                        size: 16,
                        font: "Calibri",
                      }),
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        size: 16,
                        font: "Calibri",
                      }),
                      new TextRun({
                        text: " of ",
                        size: 16,
                        font: "Calibri",
                      }),
                      new TextRun({
                        children: [PageNumber.TOTAL_PAGES],
                        size: 16,
                        font: "Calibri",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11900, height: 16840 },
            margin: {
              top: 560,
              right: 360,
              bottom: 720,
              left: 360,
              footer: 400,
            },
          },
        },
        footers: {
          default: footer,
        },
        children: [
          ...headerBlocks,
          metaTable,
          p(""),
          riskTable,
          p(""),
          scheduleTable,
          p(""),
          deductiblesTable,
          p(""),
          p("Remarks", { bold: true, size: 18 }),
          p(
            "Only Air conditioners are covered under Plant and Machinery Sum Insured of Fire section, Burglary and MBD section",
            { size: 15 },
          ),
          p("Money in transit", { bold: true, size: 15 }),
          p("a. Transit from dealer place to Bank and vice versa", { size: 14 }),
          p(
            "b. Cash carrying must be done through an authorized permanent employee of Insured.",
            { size: 14 },
          ),
          p(
            "c. Warranted that cash in transit above 1 lacs is carried through private transport.",
            { size: 14 },
          ),
          p(
            "d. Warranted that keys are not kept in the shop premises after business hours & also the cash lying outside is to be kept in safe after business hours",
            { size: 14 },
          ),
          p("e. Transit of money should take place within 50kms limit only", {
            size: 14,
          }),
          p(
            "f. Cash Carried in either in briefcase, Boxes, Bags and in any other types of carrying bags",
            { size: 14 },
          ),
          p("g. Proper accounting system is available", { size: 14 }),
          p("3) Burglary – Theft and RSMD included", { size: 14, spacingAfter: 160 }),
          premiumTable,
          p(""),
          p(
            "We hereby declare that though our aggregate turnover in any preceding financial year from 2017-18 onwards is more than the aggregate turnover notified under sub-rule (4) of rule 48, we are not required to prepare an invoice in terms of the provisions of the said sub-rule.",
            { size: 13 },
          ),
          p(""),
          p(
            "Anti Money Laundering Clause:-In the event of a claim under the policy exceeding 1 lakh or a claim for refund of premium exceeding 1 lakh, the insured will comply with the provisions of AML policy of the company. The AML policy is available in all our operating offices as well as Company's web site.",
            { size: 13 },
          ),
          p(""),
          p(
            "LET US JOIN THE FIGHT AGAINST CORRUPTION. PLEASE TAKE THE PLEDGE AT https://pledge.cvc.nic.in.",
            { size: 13 },
          ),
          p(""),
          p("For and On behalf of", { size: 15 }),
          p("United India Insurance Co. Ltd.", { bold: true, size: 17 }),
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
