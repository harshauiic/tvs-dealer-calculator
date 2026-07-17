import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { ProposalInput, ProposalResult } from "../calculator";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  title: { fontSize: 13, fontWeight: "bold", marginBottom: 4, textAlign: "center" },
  subtitle: { fontSize: 8, marginBottom: 14, textAlign: "center", color: "#555" },
  section: { marginBottom: 10, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: "#ddd" },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#1e3a8a",
  },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: "42%", color: "#444" },
  value: { width: "58%" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#bbb",
    paddingBottom: 3,
    marginBottom: 3,
  },
  tableHeaderText: { fontWeight: "bold", fontSize: 8 },
  tableRow: { flexDirection: "row", marginBottom: 2 },
  colSection: { width: "46%" },
  colSI: { width: "27%", textAlign: "right" },
  colPrem: { width: "27%", textAlign: "right" },
  descCol: { width: "60%" },
  amountCol: { width: "40%", textAlign: "right" },
  totalRow: { flexDirection: "row", marginTop: 4 },
  totalLabel: { width: "70%", fontWeight: "bold", fontSize: 10 },
  totalValue: { width: "30%", textAlign: "right", fontWeight: "bold", fontSize: 10 },
  noteBox: {
    marginTop: 4,
    marginBottom: 8,
    padding: 6,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  noteTitle: { fontWeight: "bold", marginBottom: 3, color: "#9a3412" },
  noteLine: { marginBottom: 2, color: "#7c2d12" },
  footer: { marginTop: 12, fontSize: 7, color: "#666" },
});

const STATUS_MESSAGES = new Set([
  "Cover Not Opted",
  "Kindly refer proposal to office",
]);

function formatAmount(value: number): string {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

function displayPremium(value: number | string): string {
  if (typeof value === "number") return formatAmount(Math.round(value * 100) / 100);
  if (STATUS_MESSAGES.has(value)) return value;
  return "-";
}

function displaySI(value: number, premium: number | string): string {
  if (premium === "Cover Not Opted") return "-";
  if (!value) return "-";
  return formatAmount(value);
}

function collectNotes(result: ProposalResult): string[] {
  const messages = new Set<string>(result.errors);
  const premiums = [
    ...result.locations.flatMap((l) => [l.fire_premium, l.money_premium]),
    result.fire_floater_premium,
    result.sections.burglary_premium,
    result.sections.mbd_premium,
    result.sections.plate_glass_premium,
    result.sections.neon_sign_premium,
    result.sections.public_liability_premium,
    result.sections.fidelity_premium,
  ];
  for (const premium of premiums) {
    if (typeof premium === "string" && !STATUS_MESSAGES.has(premium)) {
      messages.add(premium);
    }
  }
  if (
    typeof result.net_premium === "string" &&
    !STATUS_MESSAGES.has(result.net_premium)
  ) {
    // keep notes only from section/validation messages, not duplicate totals text
  }
  return [...messages];
}

function ProposalDocument({
  input,
  result,
}: {
  input: ProposalInput;
  result: ProposalResult;
}) {
  const today = new Date().toLocaleDateString("en-IN");
  const notes = collectNotes(result);

  const summaryRows: Array<{
    section: string;
    si: number;
    premium: number | string;
  }> = [
    ...result.locations.map((loc, i) => ({
      section: `Fire - Location ${i + 1}`,
      si: loc.total_si,
      premium: loc.fire_premium,
    })),
    ...(result.fire_floater_premium !== "Cover Not Opted"
      ? [
          {
            section: "Fire - Floater",
            si: result.fire_floater_si,
            premium: result.fire_floater_premium,
          },
        ]
      : []),
    {
      section: "Section 2 - Burglary",
      si: result.sections.burglary_si,
      premium: result.sections.burglary_premium,
    },
    {
      section: "Section 3 - MBD/EEI",
      si: result.sections.mbd_si,
      premium: result.sections.mbd_premium,
    },
    {
      section: "Section 4 - Plate glass",
      si: result.sections.plate_glass_si,
      premium: result.sections.plate_glass_premium,
    },
    {
      section: "Section 5 - Neon sign",
      si: result.sections.neon_sign_si,
      premium: result.sections.neon_sign_premium,
    },
    {
      section: "Section 6 - Public Liability",
      si: result.sections.public_liability_si,
      premium: result.sections.public_liability_premium,
    },
    {
      section: "Section 7 - Fidelity",
      si: result.sections.fidelity_si,
      premium: result.sections.fidelity_premium,
    },
    ...result.locations.map((loc, i) => ({
      section: `Money - Location ${i + 1}`,
      si: loc.money_total_si,
      premium: loc.money_premium,
    })),
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>TVS MOTOR DEALERS PACKAGE POLICY</Text>
        <Text style={styles.subtitle}>Proposal Date: {today}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insured Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Insured Name</Text>
            <Text style={styles.value}>{input.insured_name || "-"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>GSTIN Number</Text>
            <Text style={styles.value}>{input.gstin_number || "-"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Communication Address</Text>
            <Text style={styles.value}>{input.communication_address || "-"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Hypothecation 1</Text>
            <Text style={styles.value}>{input.hypothecation_1 || "-"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Hypothecation 2</Text>
            <Text style={styles.value}>{input.hypothecation_2 || "-"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Hypothecation 3</Text>
            <Text style={styles.value}>{input.hypothecation_3 || "-"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terrorism</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Opt for terrorism</Text>
            <Text style={styles.value}>{input.terrorism.opted ? "Yes" : "No"}</Text>
          </View>
          {input.terrorism.opted && (
            <View style={styles.row}>
              <Text style={styles.label}>Terrorism cover required for</Text>
              <Text style={styles.value}>{input.terrorism.scope || "-"}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Floater Cover</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Floater cover required</Text>
            <Text style={styles.value}>
              {input.floater_cover.enabled ? "Yes" : "No"}
            </Text>
          </View>
          {input.floater_cover.enabled && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Floater sum insured required</Text>
                <Text style={styles.value}>
                  {formatAmount(input.floater_cover.floater_sum_insured)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Maximum sum insured per location</Text>
                <Text style={styles.value}>
                  {formatAmount(input.floater_cover.max_sum_insured_per_location)}
                </Text>
              </View>
            </>
          )}
        </View>

        {input.locations.map((loc, i) => (
          <View key={loc.id} style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Location {i + 1}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Dealer code</Text>
              <Text style={styles.value}>{loc.dealer_code || "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.value}>{loc.address || "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Pincode / EQ Zone</Text>
              <Text style={styles.value}>
                {loc.pincode || "-"} / Zone {result.locations[i]?.eq_zone ?? "-"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Occupancy</Text>
              <Text style={styles.value}>{loc.occupancy || "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Claims in the past 3 years</Text>
              <Text style={styles.value}>{loc.claims_history || "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Insurance company</Text>
              <Text style={styles.value}>{loc.insurance_company || "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Period of cover</Text>
              <Text style={styles.value}>{loc.period_of_cover || "-"}</Text>
            </View>

            <Text style={{ fontWeight: "bold", marginTop: 6, marginBottom: 3 }}>
              Section 1 - Fire Sum Insured
            </Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.descCol, styles.tableHeaderText]}>Description</Text>
              <Text style={[styles.amountCol, styles.tableHeaderText]}>Sum Insured</Text>
            </View>
            {(
              [
                ["Building", loc.building_si],
                ["Plant & Machinery", loc.plant_machinery_si],
                ["Furniture", loc.furniture_si],
                ["Plate glass", loc.plate_glass_si],
                ["Neon sign", loc.neon_sign_si],
                ["Stocks", loc.stocks_si],
              ] as const
            ).map(([label, si]) => (
              <View key={label} style={styles.tableRow}>
                <Text style={styles.descCol}>{label}</Text>
                <Text style={styles.amountCol}>{formatAmount(si)}</Text>
              </View>
            ))}
            <View style={styles.tableRow}>
              <Text style={[styles.descCol, { fontWeight: "bold" }]}>Total Fire SI</Text>
              <Text style={[styles.amountCol, { fontWeight: "bold" }]}>
                {formatAmount(result.locations[i]?.total_si ?? 0)}
              </Text>
            </View>
            <View style={[styles.row, { marginTop: 3 }]}>
              <Text style={styles.label}>Fire Premium</Text>
              <Text style={styles.value}>
                {displayPremium(result.locations[i]?.fire_premium ?? 0)}
              </Text>
            </View>

            <Text style={{ fontWeight: "bold", marginTop: 6, marginBottom: 3 }}>
              Section 8 - Money in transit
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>Money cover</Text>
              <Text style={styles.value}>{loc.money.cover}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Annual carrying limit</Text>
              <Text style={styles.value}>
                {formatAmount(loc.money.annual_carrying_limit)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Single carrying limit</Text>
              <Text style={styles.value}>
                {formatAmount(loc.money.single_carrying_limit)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Cash in safe</Text>
              <Text style={styles.value}>{formatAmount(loc.money.cash_in_safe)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Cash in till</Text>
              <Text style={styles.value}>{formatAmount(loc.money.cash_in_till)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Money Sum Insured</Text>
              <Text style={styles.value}>
                {formatAmount(result.locations[i]?.money_total_si ?? 0)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Money Premium</Text>
              <Text style={styles.value}>
                {displayPremium(result.locations[i]?.money_premium ?? 0)}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Sections</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Burglary</Text>
            <Text style={styles.value}>{input.sections.burglary}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>MBD/EEI</Text>
            <Text style={styles.value}>{input.sections.mbd_eei}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Plate glass</Text>
            <Text style={styles.value}>{input.sections.plate_glass}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Neon sign</Text>
            <Text style={styles.value}>{input.sections.neon_sign}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Public Liability</Text>
            <Text style={styles.value}>{input.sections.public_liability}</Text>
          </View>
          {input.sections.public_liability === "Cover Opted" && (
            <View style={styles.row}>
              <Text style={styles.label}>Public Liability SI</Text>
              <Text style={styles.value}>
                {formatAmount(input.sections.public_liability_si)}
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Fidelity</Text>
            <Text style={styles.value}>{input.sections.fidelity}</Text>
          </View>
          {input.sections.fidelity === "Cover Opted" && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>No of permanent employees</Text>
                <Text style={styles.value}>
                  {String(input.sections.fidelity_employees)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Floater SI</Text>
                <Text style={styles.value}>
                  {formatAmount(input.sections.fidelity_floater_si)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Per employee limit</Text>
                <Text style={styles.value}>
                  {formatAmount(input.sections.fidelity_per_employee_limit)}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Remarks</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Remarks</Text>
            <Text style={styles.value}>
              {input.remarks.trim() ? input.remarks.trim() : "NIL"}
            </Text>
          </View>
        </View>

        {notes.length > 0 && (
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>Note</Text>
            {notes.map((note) => (
              <Text key={note} style={styles.noteLine}>
                - {note}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Summary</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.colSection, styles.tableHeaderText]}>Section</Text>
            <Text style={[styles.colSI, styles.tableHeaderText]}>Sum Insured</Text>
            <Text style={[styles.colPrem, styles.tableHeaderText]}>Premium</Text>
          </View>
          {summaryRows.map((row) => (
            <View key={row.section} style={styles.tableRow}>
              <Text style={styles.colSection}>{row.section}</Text>
              <Text style={styles.colSI}>{displaySI(row.si, row.premium)}</Text>
              <Text style={styles.colPrem}>{displayPremium(row.premium)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Net Premium</Text>
            <Text style={styles.totalValue}>{displayPremium(result.net_premium)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST</Text>
            <Text style={styles.totalValue}>{displayPremium(result.gst)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Premium (inc GST)</Text>
            <Text style={styles.totalValue}>
              {displayPremium(result.total_premium)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Deductibles: Fire 5% min Rs. 10,000 | Burglary 5% min Rs. 5,000 | Money 5% min
            Rs. 5,000
          </Text>
          <Text style={{ marginTop: 6 }}>
            I hereby declare that all information provided is true, there are nil claims in
            the past 3 years, and we are insuring all assets with no selection.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadProposalPdf(
  input: ProposalInput,
  result: ProposalResult,
) {
  const blob = await pdf(
    <ProposalDocument input={input} result={result} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `TVSM-Proposal-${input.insured_name.replace(/\s+/g, "-") || "draft"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
