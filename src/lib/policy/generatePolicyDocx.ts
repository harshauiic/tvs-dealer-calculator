import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  VerticalMergeType,
  WidthType,
} from "docx";
import type { ProposalInput, ProposalResult } from "../calculator";

export interface PolicyGenerationDetails {
  policyNumber: string;
  previousPolicyNumber: string;
  startDate: string;
  startTime: string;
  endDate: string;
}

const PAGE_WIDTH = 11000;
const FONT = "Calibri";
const SIZE_BODY = 18;
const SIZE_SMALL = 16;
const SIZE_POLICY_TITLE = 24;
const SIZE_SECTION = 20;
/** Cover-page typography (larger than schedule pages). */
const COVER_COMPANY = 32;
const COVER_ADDRESS = 20;
const COVER_TITLE = 28;
const COVER_LINE = 22;
const UIN = "IRDAN545RP0297V01200708";
const COVER_NOT_OPTED = "COVER NOT OPTED";

const THIN = { style: BorderStyle.SINGLE, size: 8, color: "000000" };
const THICK = { style: BorderStyle.SINGLE, size: 12, color: "1e3a8a" };
const BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const BOX_BORDERS = { top: THICK, bottom: THICK, left: THICK, right: THICK };
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const FOOTER_TOP = {
  top: { style: BorderStyle.SINGLE, size: 6, color: "666666" },
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
  return `${time} hrs of ${formatDisplayDate(date)}`;
}

function formatEndPeriod(date: string): string {
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

function run(
  text: string,
  opts?: { bold?: boolean; size?: number; color?: string },
) {
  return new TextRun({
    text,
    bold: opts?.bold,
    size: opts?.size ?? SIZE_BODY,
    font: FONT,
    color: opts?.color,
  });
}

function p(
  text: string,
  opts?: {
    bold?: boolean;
    size?: number;
    center?: boolean;
    after?: number;
    before?: number;
    color?: string;
  },
) {
  return new Paragraph({
    alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: opts?.after ?? 40, before: opts?.before ?? 0 },
    children: [
      run(text, {
        bold: opts?.bold,
        size: opts?.size ?? SIZE_BODY,
        color: opts?.color,
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
    size?: number;
    verticalMerge?: (typeof VerticalMergeType)[keyof typeof VerticalMergeType];
    borders?: typeof BORDERS;
  },
) {
  return new TableCell({
    borders: opts?.borders ?? BORDERS,
    columnSpan: opts?.span,
    verticalMerge: opts?.verticalMerge,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: opts?.fill ? { fill: opts.fill } : undefined,
    children: [
      new Paragraph({
        alignment: opts?.align ?? AlignmentType.LEFT,
        spacing: { before: 30, after: 30 },
        children: [
          run(text, {
            bold: opts?.bold,
            size: opts?.size ?? SIZE_BODY,
          }),
        ],
      }),
    ],
  });
}

function coverLabel(opted: boolean, value?: number): string {
  if (!opted) return COVER_NOT_OPTED;
  return fmtNum(value ?? 0);
}

async function fetchImage(path: string): Promise<Uint8Array> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return new Uint8Array(await response.arrayBuffer());
}

function logoParagraph(
  logoBytes: Uint8Array,
  width = 100,
  height = 77,
  after = 120,
  align: Align = AlignmentType.CENTER,
) {
  return new Paragraph({
    alignment: align,
    spacing: { after },
    children: [
      new ImageRun({
        type: "png",
        data: logoBytes,
        transformation: { width, height },
      }),
    ],
  });
}

/** Period-of-insurance box on the cover (full width, centered text). */
function coverCard(
  children: Paragraph[],
  opts?: { fill?: string; strongBorder?: boolean; width?: number },
) {
  const width = opts?.width ?? PAGE_WIDTH;
  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths: [width],
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: opts?.strongBorder ? BOX_BORDERS : BORDERS,
            width: { size: width, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: opts?.fill ?? "FFFFFF" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 100 },
                children: [],
              }),
              ...children,
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 },
                children: [],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function spacer(after = 120) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after },
    children: [],
  });
}

/** Centered label/value rows for cover (Agent Name / Agent Code alignment). */
function coverKeyValueTable(rows: Array<[string, string]>) {
  const labelW = 3200;
  const valueW = 5600;
  const inner = labelW + valueW;
  const side = Math.floor((PAGE_WIDTH - inner) / 2);
  const right = PAGE_WIDTH - side - inner;

  return new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: [side, labelW, valueW, right],
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              borders: NO_BORDERS,
              width: { size: side, type: WidthType.DXA },
              children: [new Paragraph({ children: [] })],
            }),
            new TableCell({
              borders: NO_BORDERS,
              width: { size: labelW, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 80 },
                  children: [
                    run(`${label}`, { bold: true, size: COVER_LINE }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: NO_BORDERS,
              width: { size: valueW, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  spacing: { after: 80 },
                  children: [
                    run(`:  ${value}`, { size: COVER_LINE }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: NO_BORDERS,
              width: { size: right, type: WidthType.DXA },
              children: [new Paragraph({ children: [] })],
            }),
          ],
        }),
    ),
  });
}

function policyFooter(policyNumber: string) {
  return new Footer({
    children: [
      new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [5500, 5500],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: FOOTER_TOP,
                width: { size: 5500, type: WidthType.DXA },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 60 },
                    children: [
                      run(`Policy No.: ${policyNumber}`, {
                        bold: true,
                        size: SIZE_SMALL,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders: FOOTER_TOP,
                width: { size: 5500, type: WidthType.DXA },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 60 },
                    children: [
                      run("Page ", { size: SIZE_SMALL }),
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        font: FONT,
                        size: SIZE_SMALL,
                      }),
                      run(" of ", { size: SIZE_SMALL }),
                      new TextRun({
                        children: [PageNumber.TOTAL_PAGES],
                        font: FONT,
                        size: SIZE_SMALL,
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
}

/** Cover footer: genuineness/contact notes sit just above Policy No / page numbers. */
function coverFooter(policyNumber: string) {
  return new Footer({
    children: [
      p(
        'The genuineness of the policy can be verified through "Verify Your Policy" link at www.uiic.co.in.',
        { center: true, size: SIZE_SMALL, after: 40 },
      ),
      p(
        "For any Information, Service Requests, Claim intimation and Grievances please write to 013100@uiic.co.in",
        { center: true, size: SIZE_SMALL, after: 40 },
      ),
      p(
        "Download Customer App (www.uiic.co.in). REGD. & HEAD OFFICE, 24, WHITES ROAD, CHENNAI - 600014.",
        { center: true, size: SIZE_SMALL, after: 30 },
      ),
      p("Website: http://www.uiic.co.in", {
        center: true,
        size: SIZE_SMALL,
        after: 80,
      }),
      new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [5500, 5500],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: FOOTER_TOP,
                width: { size: 5500, type: WidthType.DXA },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 60 },
                    children: [
                      run(`Policy No.: ${policyNumber}`, {
                        bold: true,
                        size: SIZE_SMALL,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders: FOOTER_TOP,
                width: { size: 5500, type: WidthType.DXA },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 60 },
                    children: [
                      run("Page ", { size: SIZE_SMALL }),
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        font: FONT,
                        size: SIZE_SMALL,
                      }),
                      run(" of ", { size: SIZE_SMALL }),
                      new TextRun({
                        children: [PageNumber.TOTAL_PAGES],
                        font: FONT,
                        size: SIZE_SMALL,
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
}

export async function downloadPolicyDocx(
  input: ProposalInput,
  result: ProposalResult,
  details: PolicyGenerationDetails,
): Promise<void> {
  const [logoBytes, signatureBytes] = await Promise.all([
    fetchImage("uiic-policy-logo.png"),
    fetchImage("policy-signature.png"),
  ]);

  const locations = input.locations;
  const sectionW = 1700;
  const fieldW = 1900;
  /** Keep schedule columns readable; split into multiple tables when more locations. */
  const MAX_LOCS_PER_SCHEDULE = 3;

  const startText = formatStartPeriod(details.startDate, details.startTime);
  const endText = formatEndPeriod(details.endDate);

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
  const fireFloater = input.floater_cover.enabled
    ? fmtNum(input.floater_cover.floater_sum_insured)
    : COVER_NOT_OPTED;
  const terrorism = input.terrorism.opted ? "COVER OPTED" : COVER_NOT_OPTED;

  // ---- Cover page (page 1): layout modeled on templates/headerRef.docx ----
  // Logo is in the page header (centered) on every page — not repeated in body.
  const periodTable = coverCard(
    [
      p("PERIOD OF INSURANCE", {
        bold: true,
        center: true,
        size: COVER_LINE,
        after: 60,
      }),
      p(`From ${startText} To ${endText}`, {
        bold: true,
        center: true,
        size: COVER_ADDRESS,
        after: 20,
      }),
    ],
    { fill: "F0F5FF", strongBorder: true, width: PAGE_WIDTH },
  );

  const coverChildren = [
    p("UNITED INDIA INSURANCE COMPANY LIMITED", {
      bold: true,
      center: true,
      size: COVER_COMPANY,
      after: 80,
    }),
    p("FAGUN CHAMBERS, NO. 1 & 2, II FLOOR, 26A, ETHIRAJ SALAI,", {
      center: true,
      size: COVER_ADDRESS,
      after: 20,
    }),
    p("EGMORE, CHENNAI 600008 TAMIL NADU", {
      center: true,
      size: COVER_ADDRESS,
      after: 20,
    }),
    p("PHONE: (044) 25384955", {
      center: true,
      size: COVER_ADDRESS,
      after: 120,
    }),
    p("SPECIAL CONTINGENCY POLICY", {
      bold: true,
      center: true,
      size: COVER_TITLE,
      after: 60,
    }),
    p(`POLICY NO.: ${details.policyNumber}`, {
      bold: true,
      center: true,
      size: COVER_LINE,
      after: 40,
    }),
    p(`UIN NO.: ${UIN}`, {
      bold: true,
      center: true,
      size: COVER_LINE,
      after: 140,
    }),
    periodTable,
    spacer(160),
    p("Insured", {
      bold: true,
      center: true,
      size: COVER_LINE,
      after: 60,
    }),
    p(input.insured_name.toUpperCase(), {
      bold: true,
      center: true,
      size: COVER_TITLE,
      after: 60,
    }),
    p(input.communication_address || "-", {
      center: true,
      size: COVER_ADDRESS,
      after: 80,
    }),
    spacer(100),
    coverKeyValueTable([
      ["Agent Name", "HARITA INSURANCE BROKING LLP"],
      ["Agent Code", "BRC0000921"],
      ...(details.previousPolicyNumber
        ? ([["Previous Policy No.", details.previousPolicyNumber]] as Array<
            [string, string]
          >)
        : []),
    ]),
  ];

  // ---- Schedule page ----
  const metaTable = new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: [2200, 3300, 2200, 3300],
    rows: [
      new TableRow({
        children: [
          cell("Policy Number", 2200, { bold: true, fill: "D6E3F0" }),
          cell(details.policyNumber, 3300),
          cell("Previous Policy No", 2200, { bold: true, fill: "D6E3F0" }),
          cell(details.previousPolicyNumber || " ", 3300),
        ],
      }),
      new TableRow({
        children: [
          cell("Insured name", 2200, { bold: true, fill: "D6E3F0" }),
          cell(input.insured_name || " ", 8800, { span: 3 }),
        ],
      }),
      new TableRow({
        children: [
          cell("GSTIN of Insured", 2200, { bold: true, fill: "D6E3F0" }),
          cell(input.gstin_number || " ", 8800, { span: 3 }),
        ],
      }),
      new TableRow({
        children: [
          cell("Period Of Insurance", 2200, { bold: true, fill: "D6E3F0" }),
          cell(`From ${startText}`, 3300),
          cell("To", 2200, {
            bold: true,
            align: AlignmentType.LEFT,
            fill: "D6E3F0",
          }),
          cell(endText, 3300),
        ],
      }),
    ],
  });

  const riskTable = new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: [2200, 5200, 3600],
    rows: [
      new TableRow({
        children: [
          cell("Risk Location details", PAGE_WIDTH, {
            bold: true,
            span: 3,
            align: AlignmentType.CENTER,
            fill: "D6E3F0",
            size: SIZE_SECTION,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell(" ", 2200, { fill: "EEF2F7" }),
          cell("Risk location address", 5200, {
            bold: true,
            fill: "EEF2F7",
            align: AlignmentType.CENTER,
          }),
          cell("Occupancy", 3600, {
            bold: true,
            fill: "EEF2F7",
            align: AlignmentType.CENTER,
          }),
        ],
      }),
      ...locations.map(
        (loc, i) =>
          new TableRow({
            children: [
              cell(`Location ${i + 1}`, 2200, { bold: true }),
              cell(
                `${loc.address}${loc.pincode ? ` - ${loc.pincode}` : ""}`,
                5200,
              ),
              cell(loc.occupancy || "-", 3600),
            ],
          }),
      ),
    ],
  });


  const burglaryFloater = input.floater_cover.enabled
    ? fmtNum(input.floater_cover.floater_sum_insured)
    : COVER_NOT_OPTED;

  function buildScheduleTable(
    slice: ProposalInput["locations"],
    startIndex: number,
  ): Table {
    const sliceCount = Math.max(slice.length, 1);
    const locTotalW = PAGE_WIDTH - sectionW - fieldW;
    const locW = Math.floor(locTotalW / sliceCount);
    const locWidths = Array.from({ length: sliceCount }, (_, i) =>
      i === sliceCount - 1 ? locTotalW - locW * (sliceCount - 1) : locW,
    );
    const scheduleColWidths = [sectionW, fieldW, ...locWidths];

    const amountAlign = (v: string | number): Align =>
      typeof v === "number" || /^\d/.test(String(v))
        ? AlignmentType.RIGHT
        : AlignmentType.LEFT;

    function valueCells(values: Array<string | number>) {
      return values.map((v, i) =>
        cell(typeof v === "number" ? fmtNum(v) : v, locWidths[i], {
          align: amountAlign(v),
        }),
      );
    }

    function sectionStartRow(
      section: string,
      label: string,
      values: Array<string | number>,
    ): TableRow {
      return new TableRow({
        children: [
          cell(section, sectionW, {
            bold: true,
            fill: "E8EEF7",
            verticalMerge: VerticalMergeType.RESTART,
            align: AlignmentType.LEFT,
            size: SIZE_SMALL,
          }),
          cell(label, fieldW),
          ...valueCells(values),
        ],
      });
    }

    function sectionContinueRow(
      label: string,
      values: Array<string | number>,
    ): TableRow {
      return new TableRow({
        children: [
          cell("", sectionW, {
            fill: "E8EEF7",
            verticalMerge: VerticalMergeType.CONTINUE,
          }),
          cell(label, fieldW),
          ...valueCells(values),
        ],
      });
    }

    function spanSectionRow(
      section: string,
      label: string,
      value: string,
      merge: "restart" | "continue" | "none" = "none",
    ): TableRow {
      const sectionCell =
        merge === "restart"
          ? cell(section, sectionW, {
              bold: true,
              fill: "E8EEF7",
              verticalMerge: VerticalMergeType.RESTART,
              align: AlignmentType.LEFT,
              size: SIZE_SMALL,
            })
          : merge === "continue"
            ? cell("", sectionW, {
                fill: "E8EEF7",
                verticalMerge: VerticalMergeType.CONTINUE,
              })
            : cell(section, sectionW, {
                bold: Boolean(section),
                fill: section ? "E8EEF7" : undefined,
                align: AlignmentType.LEFT,
                size: SIZE_SMALL,
              });

      return new TableRow({
        children: [
          sectionCell,
          cell(label, fieldW),
          cell(value, locTotalW, {
            span: sliceCount,
            align: AlignmentType.LEFT,
            bold: value === COVER_NOT_OPTED,
          }),
        ],
      });
    }

    const fireRows: TableRow[] = [
      sectionStartRow(
        "Section 1 - Fire",
        "Building SI",
        slice.map((l) => l.building_si),
      ),
      sectionContinueRow(
        "Plant and machinery SI",
        slice.map((l) => l.plant_machinery_si),
      ),
      sectionContinueRow(
        "Furniture Fixtures SI",
        slice.map((l) => l.furniture_si),
      ),
      sectionContinueRow(
        "Plate glass SI",
        slice.map((l) => l.plate_glass_si),
      ),
      sectionContinueRow(
        "Neon sign SI",
        slice.map((l) => l.neon_sign_si),
      ),
      sectionContinueRow(
        "Stocks SI",
        slice.map((l) =>
          input.floater_cover.enabled ? "As per floater" : l.stocks_si,
        ),
      ),
      sectionContinueRow(
        "Total SI",
        slice.map((l) => locationTotalSI(l)),
      ),
      spanSectionRow("", "Fire Floater", fireFloater, "continue"),
      spanSectionRow("", "Terrorism", terrorism, "continue"),
    ];

    const burglaryRows: TableRow[] = burglaryOpted
      ? [
          sectionStartRow(
            "Section 2 – Burglary",
            "Plant and machinery SI",
            slice.map((l) => l.plant_machinery_si),
          ),
          sectionContinueRow(
            "Furniture Fixtures SI",
            slice.map((l) => l.furniture_si),
          ),
          sectionContinueRow(
            "Plate glass SI",
            slice.map((l) => l.plate_glass_si),
          ),
          sectionContinueRow(
            "Neon sign SI",
            slice.map((l) => l.neon_sign_si),
          ),
          sectionContinueRow(
            "Stocks SI",
            slice.map((l) =>
              input.floater_cover.enabled ? "As per floater" : l.stocks_si,
            ),
          ),
          sectionContinueRow(
            "Total SI",
            slice.map(
              (l) =>
                l.plant_machinery_si +
                l.furniture_si +
                l.plate_glass_si +
                l.neon_sign_si +
                (input.floater_cover.enabled ? 0 : l.stocks_si),
            ),
          ),
          spanSectionRow("", "Stock Floater SI", burglaryFloater, "continue"),
        ]
      : [spanSectionRow("Section 2 – Burglary", "Sum Insured", COVER_NOT_OPTED)];

    const mbdRows: TableRow[] = mbdOpted
      ? [
          sectionStartRow(
            "Section 3 – MBD/EEI",
            "Sum Insured",
            slice.map((l) => l.plant_machinery_si),
          ),
        ]
      : [spanSectionRow("Section 3 – MBD/EEI", "Sum Insured", COVER_NOT_OPTED)];

    const plateRows: TableRow[] = plateOpted
      ? [
          sectionStartRow(
            "Section 4 – Plate glass",
            "Sum Insured",
            slice.map((l) => l.plate_glass_si),
          ),
        ]
      : [
          spanSectionRow(
            "Section 4 – Plate glass",
            "Sum Insured",
            COVER_NOT_OPTED,
          ),
        ];

    const neonRows: TableRow[] = neonOpted
      ? [
          sectionStartRow(
            "Section 5 – Neon sign",
            "Sum Insured",
            slice.map((l) => l.neon_sign_si),
          ),
        ]
      : [spanSectionRow("Section 5 – Neon sign", "Sum Insured", COVER_NOT_OPTED)];

    const plRows = [
      spanSectionRow(
        "Section 6 – Public liability",
        "Sum Insured",
        coverLabel(plOpted, input.sections.public_liability_si),
      ),
    ];

    const fidelityRows = [
      spanSectionRow(
        "Section 7 - Fidelity",
        "No of permanent employees",
        fidelityOpted
          ? String(Math.round(input.sections.fidelity_employees))
          : COVER_NOT_OPTED,
        "restart",
      ),
      spanSectionRow(
        "",
        "Floater SI",
        coverLabel(fidelityOpted, input.sections.fidelity_floater_si),
        "continue",
      ),
      spanSectionRow(
        "",
        "Per employee limit",
        coverLabel(fidelityOpted, input.sections.fidelity_per_employee_limit),
        "continue",
      ),
    ];

    const moneyRows: TableRow[] = [
      sectionStartRow(
        "Section 8 – Money In transit",
        "Annual Carrying limit",
        slice.map((l) =>
          l.money.cover === "Opted" ? l.money.annual_carrying_limit : 0,
        ),
      ),
      sectionContinueRow(
        "Single carrying limit",
        slice.map((l) =>
          l.money.cover === "Opted" ? l.money.single_carrying_limit : 0,
        ),
      ),
      sectionContinueRow(
        "Cash in safe",
        slice.map((l) => (l.money.cover === "Opted" ? l.money.cash_in_safe : 0)),
      ),
      sectionContinueRow(
        "Cash in till",
        slice.map((l) => (l.money.cover === "Opted" ? l.money.cash_in_till : 0)),
      ),
      spanSectionRow("", "Terrorism", terrorism, "continue"),
    ];

    const scheduleHeader = new TableRow({
      children: [
        new TableCell({
          borders: BORDERS,
          width: { size: sectionW, type: WidthType.DXA },
          shading: { fill: "1E3A8A" },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                run("Section", { bold: true, size: SIZE_SMALL, color: "FFFFFF" }),
              ],
            }),
          ],
        }),
        new TableCell({
          borders: BORDERS,
          width: { size: fieldW, type: WidthType.DXA },
          shading: { fill: "1E3A8A" },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                run("Particulars", {
                  bold: true,
                  size: SIZE_SMALL,
                  color: "FFFFFF",
                }),
              ],
            }),
          ],
        }),
        ...slice.map((_, i) =>
          new TableCell({
            borders: BORDERS,
            width: { size: locWidths[i], type: WidthType.DXA },
            shading: { fill: "1E3A8A" },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  run(`Location ${startIndex + i + 1}`, {
                    bold: true,
                    size: SIZE_SMALL,
                    color: "FFFFFF",
                  }),
                ],
              }),
            ],
          }),
        ),
      ],
    });

    return new Table({
      width: { size: PAGE_WIDTH, type: WidthType.DXA },
      columnWidths: scheduleColWidths,
      rows: [
        scheduleHeader,
        ...fireRows,
        ...burglaryRows,
        ...mbdRows,
        ...plateRows,
        ...neonRows,
        ...plRows,
        ...fidelityRows,
        ...moneyRows,
      ],
    });
  }

  const locationChunks: ProposalInput["locations"][] = [];
  if (locations.length <= MAX_LOCS_PER_SCHEDULE) {
    locationChunks.push(locations);
  } else {
    for (let i = 0; i < locations.length; i += MAX_LOCS_PER_SCHEDULE) {
      locationChunks.push(locations.slice(i, i + MAX_LOCS_PER_SCHEDULE));
    }
  }

  const scheduleBlocks = locationChunks.flatMap((chunk, chunkIndex) => {
    const table = buildScheduleTable(chunk, chunkIndex * MAX_LOCS_PER_SCHEDULE);
    return chunkIndex === 0 ? [table] : [p(""), table];
  });

  const deductiblesTable = new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: [3500, 7500],
    rows: [
      new TableRow({
        children: [
          cell("Deductibles / Excess", PAGE_WIDTH, {
            bold: true,
            span: 2,
            align: AlignmentType.CENTER,
            fill: "D6E3F0",
            size: SIZE_SECTION,
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
              cell(label, 3500, { bold: true }),
              cell(value, 7500),
            ],
          }),
      ),
    ],
  });

  const definitionsTable = new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: [3500, 7500],
    rows: [
      new TableRow({
        children: [
          cell("Definitions", PAGE_WIDTH, {
            bold: true,
            span: 2,
            align: AlignmentType.CENTER,
            fill: "D6E3F0",
            size: SIZE_SECTION,
          }),
        ],
      }),
      ...(
        [
          [
            "Building",
            "Building incl Plinth, foundation, Basement, compound Walls, Gates & other civil structure pertaining to Insured within the premises.",
          ],
          [
            "Plant & Machinery",
            "Plant & Machinery inc Service equipments, Computers, Printers and Office equipments.",
          ],
          [
            "Furniture, Fixtures, Fittings and other contents",
            "Furnitures, Fixtures, Fittings and others contents (exc equipments).",
          ],
          ["Plate glass", "Plate glass only."],
          ["Neon sign", "Neon sign only."],
          [
            "Stocks",
            "Stocks means all kinds of vehicles (new vehicles, service vehicles), spares and lubricants stored within the premises.",
          ],
        ] as const
      ).map(
        ([label, value]) =>
          new TableRow({
            children: [
              cell(label, 3500, { bold: true }),
              cell(value, 7500),
            ],
          }),
      ),
    ],
  });

  const conditionsBlocks = [
    p("Conditions", {
      bold: true,
      size: SIZE_SECTION,
      before: 120,
      after: 60,
      color: "1E3A8A",
    }),
    p("1) Fire section:", { bold: true }),
    p(
      "a. Sum Insured should be less than 50Crs of all Insurable assets in the risk location.",
      { after: 60 },
    ),
    p("2) Burglary:", { bold: true }),
    p("a. Theft and RSMD included."),
    p(
      "b. CCTV must be installed/ Watch and ward to be employed at the risk locations.",
      { after: 60 },
    ),
    p("3) Money:", { bold: true }),
    p("a. Transit from dealer place to Bank and vice versa."),
    p(
      "b. Cash carrying must be done through an authorised permanent employee of Insured.",
    ),
    p(
      "c. Warranted that cash in transit above 1 lacs is carried through private transport.",
    ),
    p(
      "d. Warranted that keys are not kept in the shop premises after business hours & also the cash lying outside is to be kept in safe after business hours (Safe means heavy duty metallic lockable container).",
    ),
    p("e. Transit of money should take place within 50kms limit only."),
    p(
      "f. Cash Carried in either in briefcase, Boxes, Bags and in any other types of carrying bags.",
    ),
    p("g. Proper accounting system is available.", { after: 60 }),
    p("4) Fidelity:", { bold: true }),
    p("a. Only permanent employees are covered."),
    p(
      "b. Loss of property entrusted to any person other than the designated employee of the Insured is not covered.",
      { after: 60 },
    ),
    p("5) MBD and EEI:", { bold: true }),
    p("a. All machineries and equipments are covered.", { after: 120 }),
  ];

  const premiumTable = new Table({
    width: { size: 4500, type: WidthType.DXA },
    columnWidths: [2200, 2300],
    alignment: AlignmentType.LEFT,
    rows: [
      new TableRow({
        children: [
          cell("Premium Summary", 4500, {
            bold: true,
            span: 2,
            align: AlignmentType.CENTER,
            fill: "D6E3F0",
            size: SIZE_SECTION,
          }),
        ],
      }),
      ...(
        [
          ["Premium:", fmtMoney(net)],
          ["GST (18%):", fmtMoney(gst)],
          ["Stamp duty:", fmtMoney(stampDuty)],
          ["Total:", fmtMoney(total)],
        ] as const
      ).map(
        ([label, value]) =>
          new TableRow({
            children: [
              cell(label, 2200, { bold: true, fill: "EEF2F7" }),
              cell(value, 2300, { align: AlignmentType.RIGHT, bold: true }),
            ],
          }),
      ),
    ],
  });

  const signatureBlock = [
    p("For and On behalf of", { before: 200 }),
    p("United India Insurance Co. Ltd.", {
      bold: true,
      size: SIZE_SECTION,
      after: 80,
    }),
    new Paragraph({
      spacing: { before: 60, after: 40 },
      children: [
        new ImageRun({
          type: "png",
          data: signatureBytes,
          transformation: { width: 160, height: 96 },
        }),
      ],
    }),
  ];

  const logoHeader = new Header({
    children: [logoParagraph(logoBytes, 110, 84, 40, AlignmentType.CENTER)],
  });

  const footer = policyFooter(details.policyNumber);
  const firstPageFooter = coverFooter(details.policyNumber);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE_BODY },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11900, height: 16840 },
            margin: {
              top: 900,
              right: 500,
              bottom: 1400,
              left: 500,
              header: 300,
              footer: 600,
            },
          },
        },
        headers: { default: logoHeader },
        footers: { default: firstPageFooter },
        children: coverChildren,
      },
      {
        properties: {
          page: {
            size: { width: 11900, height: 16840 },
            margin: {
              top: 900,
              right: 400,
              bottom: 700,
              left: 400,
              header: 300,
              footer: 400,
            },
          },
        },
        headers: { default: logoHeader },
        footers: { default: footer },
        children: [
          p("SPECIAL CONTINGENCY POLICY SCHEDULE", {
            bold: true,
            center: true,
            size: SIZE_POLICY_TITLE,
            after: 120,
            color: "1E3A8A",
          }),
          metaTable,
          p(""),
          riskTable,
          p(""),
          ...scheduleBlocks,
          p(""),
          deductiblesTable,
          p(""),
          definitionsTable,
          ...conditionsBlocks,
          premiumTable,
          p(""),
          p(
            "We hereby declare that though our aggregate turnover in any preceding financial year from 2017-18 onwards is more than the aggregate turnover notified under sub-rule (4) of rule 48, we are not required to prepare an invoice in terms of the provisions of the said sub-rule.",
            { size: SIZE_SMALL },
          ),
          p(""),
          p(
            "Anti Money Laundering Clause:-In the event of a claim under the policy exceeding 1 lakh or a claim for refund of premium exceeding 1 lakh, the insured will comply with the provisions of AML policy of the company. The AML policy is available in all our operating offices as well as Company's web site.",
            { size: SIZE_SMALL },
          ),
          p(""),
          p(
            "LET US JOIN THE FIGHT AGAINST CORRUPTION. PLEASE TAKE THE PLEDGE AT https://pledge.cvc.nic.in.",
            { size: SIZE_SMALL },
          ),
          ...signatureBlock,
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
  a.download = `UIIC-Policy-${safePolicy}-${safeName}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
