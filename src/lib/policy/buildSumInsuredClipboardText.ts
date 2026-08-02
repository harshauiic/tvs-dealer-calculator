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

function line(label: string, value: string | number): string {
  const formatted =
    typeof value === "number" ? formatCurrency(value) : value;
  return `  ${label}: ${formatted}`;
}

/** Plain-text sum insured listing for clipboard (location-wise, opted sections only). */
export function buildSumInsuredClipboardText(input: ProposalInput): string {
  const blocks: string[] = [];
  const { sections, floater_cover: floater } = input;

  input.locations.forEach((loc, index) => {
    const lines: string[] = [
      `Location ${index + 1}${loc.address ? ` — ${loc.address}` : ""}${
        loc.pincode ? ` (${loc.pincode})` : ""
      }`,
      "",
      "Section 1 - Fire",
      line("Building SI", loc.building_si),
      line("Plant and machinery SI", loc.plant_machinery_si),
      line("Furniture Fixtures SI", loc.furniture_si),
      line("Plate glass SI", loc.plate_glass_si),
      line("Neon sign SI", loc.neon_sign_si),
      line(
        "Stocks SI",
        floater.enabled ? "As per floater" : loc.stocks_si,
      ),
      line("Total Fire SI", locationTotalSI(loc)),
    ];

    if (sections.burglary === "Cover Opted") {
      const burglaryTotal =
        loc.plant_machinery_si +
        loc.furniture_si +
        loc.plate_glass_si +
        loc.neon_sign_si +
        (floater.enabled ? 0 : loc.stocks_si);
      lines.push(
        "",
        "Section 2 - Burglary",
        line("Plant and machinery SI", loc.plant_machinery_si),
        line("Furniture Fixtures SI", loc.furniture_si),
        line("Plate glass SI", loc.plate_glass_si),
        line("Neon sign SI", loc.neon_sign_si),
        line(
          "Stocks SI",
          floater.enabled ? "As per floater" : loc.stocks_si,
        ),
        line("Total Burglary SI", burglaryTotal),
      );
    }

    if (sections.mbd_eei === "Cover Opted") {
      lines.push(
        "",
        "Section 3 - MBD/EEI",
        line("Sum Insured", loc.plant_machinery_si),
      );
    }

    if (sections.plate_glass === "Cover Opted") {
      lines.push(
        "",
        "Section 4 - Plate glass",
        line("Sum Insured", loc.plate_glass_si),
      );
    }

    if (sections.neon_sign === "Cover Opted") {
      lines.push(
        "",
        "Section 5 - Neon sign",
        line("Sum Insured", loc.neon_sign_si),
      );
    }

    if (loc.money.cover === "Opted") {
      lines.push(
        "",
        "Section 8 - Money in transit",
        line("Annual carrying limit", loc.money.annual_carrying_limit),
        line("Single carrying limit", loc.money.single_carrying_limit),
        line("Cash in safe", loc.money.cash_in_safe),
        line("Cash in till", loc.money.cash_in_till),
      );
    }

    blocks.push(lines.join("\n"));
  });

  const common: string[] = [];

  if (floater.enabled) {
    common.push(
      "Stock Floater (common to all locations)",
      line("Floater Sum Insured", floater.floater_sum_insured),
      line(
        "Maximum stock SI per location",
        floater.max_sum_insured_per_location,
      ),
    );
  }

  if (sections.public_liability === "Cover Opted") {
    if (common.length) common.push("");
    common.push(
      "Section 6 - Public Liability (common)",
      line("Sum Insured", sections.public_liability_si),
    );
  }

  if (sections.fidelity === "Cover Opted") {
    if (common.length) common.push("");
    common.push(
      "Section 7 - Fidelity (common)",
      line("No. of permanent employees", sections.fidelity_employees),
      line("Floater SI", sections.fidelity_floater_si),
      line("Per employee limit", sections.fidelity_per_employee_limit),
    );
  }

  if (common.length) {
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
