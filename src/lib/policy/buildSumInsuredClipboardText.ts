import { formatCurrency, type ProposalInput } from "../calculator";

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

function moneyTotalSI(loc: ProposalInput["locations"][0]): number {
  return (
    loc.money.annual_carrying_limit +
    loc.money.cash_in_safe +
    loc.money.cash_in_till
  );
}

function line(label: string, value: string | number): string {
  const formatted =
    typeof value === "number" ? formatCurrency(value) : value;
  return `  ${label}: ${formatted}`;
}

/** Plain-text sum insured listing for clipboard (location + section totals only). */
export function buildSumInsuredClipboardText(input: ProposalInput): string {
  const blocks: string[] = [];
  const { sections, floater_cover: floater } = input;

  input.locations.forEach((loc, index) => {
    const lines: string[] = [
      `Location ${index + 1}${loc.address ? ` — ${loc.address}` : ""}${
        loc.pincode ? ` (${loc.pincode})` : ""
      }`,
      line("Occupancy", loc.occupancy || "-"),
      line("Section 1 - Fire", locationTotalSI(loc)),
    ];

    if (sections.burglary === "Cover Opted") {
      const burglaryTotal =
        loc.plant_machinery_si +
        loc.furniture_si +
        loc.plate_glass_si +
        loc.neon_sign_si +
        (floater.enabled ? 0 : loc.stocks_si);
      lines.push(line("Section 2 - Burglary", burglaryTotal));
    }

    if (sections.mbd_eei === "Cover Opted") {
      lines.push(line("Section 3 - MBD/EEI", loc.plant_machinery_si));
    }

    if (sections.plate_glass === "Cover Opted") {
      lines.push(line("Section 4 - Plate glass", loc.plate_glass_si));
    }

    if (sections.neon_sign === "Cover Opted") {
      lines.push(line("Section 5 - Neon sign", loc.neon_sign_si));
    }

    if (loc.money.cover === "Opted") {
      lines.push(line("Section 8 - Money in transit", moneyTotalSI(loc)));
    }

    blocks.push(lines.join("\n"));
  });

  const common: string[] = ["Common"];

  if (floater.enabled) {
    common.push(line("Stock Floater", floater.floater_sum_insured));
  }

  if (sections.public_liability === "Cover Opted") {
    common.push(
      line("Section 6 - Public Liability", sections.public_liability_si),
    );
  }

  if (sections.fidelity === "Cover Opted") {
    common.push(line("Section 7 - Fidelity", sections.fidelity_floater_si));
  }

  if (common.length > 1) {
    blocks.push(common.join("\n"));
  }

  const header = [
    "Sum Insured Summary",
    input.insured_name ? `Insured: ${input.insured_name}` : null,
    "",
  ]
    .filter((x): x is string => x !== null)
    .join("\n");

  return `${header}${blocks.join("\n\n")}\n`;
}
