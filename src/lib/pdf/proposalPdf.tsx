import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { ProposalInput, ProposalResult } from "../calculator";
import { formatCurrency } from "../calculator";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 14, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 9, marginBottom: 16, textAlign: "center", color: "#444" },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 6, color: "#1e3a8a" },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: "45%" },
  value: { width: "55%" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: "bold",
  },
  tableRow: { flexDirection: "row", marginBottom: 2 },
  col1: { width: "60%" },
  col2: { width: "20%", textAlign: "right" },
  col3: { width: "20%", textAlign: "right" },
  total: { marginTop: 8, fontSize: 11, fontWeight: "bold" },
  footer: { marginTop: 20, fontSize: 8, color: "#666" },
});

function display(value: number | string) {
  return typeof value === "number" ? formatCurrency(value) : String(value);
}

function ProposalDocument({
  input,
  result,
}: {
  input: ProposalInput;
  result: ProposalResult;
}) {
  const today = new Date().toLocaleDateString("en-IN");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>TVS MOTOR DEALERS PACKAGE POLICY</Text>
        <Text style={styles.subtitle}>Proposal Date: {today}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insured Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Insured Name</Text>
            <Text style={styles.value}>{input.insured_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>GSTIN Number</Text>
            <Text style={styles.value}>{input.gstin_number || "-"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Communication Address</Text>
            <Text style={styles.value}>{input.communication_address}</Text>
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
              <Text style={styles.value}>{input.terrorism.scope}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Floater Cover</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Floater cover required</Text>
            <Text style={styles.value}>{input.floater_cover.enabled ? "Yes" : "No"}</Text>
          </View>
          {input.floater_cover.enabled && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Floater sum insured required</Text>
                <Text style={styles.value}>
                  {formatCurrency(input.floater_cover.floater_sum_insured)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Maximum sum insured per location</Text>
                <Text style={styles.value}>
                  {formatCurrency(input.floater_cover.max_sum_insured_per_location)}
                </Text>
              </View>
            </>
          )}
        </View>

        {input.locations.map((loc, i) => (
          <View key={loc.id} style={styles.section}>
            <Text style={styles.sectionTitle}>Location {i + 1}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.value}>{loc.address}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Pincode / EQ Zone</Text>
              <Text style={styles.value}>
                {loc.pincode} / Zone {result.locations[i]?.eq_zone ?? "-"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Occupancy</Text>
              <Text style={styles.value}>{loc.occupancy}</Text>
            </View>

            <View style={{ marginTop: 6 }}>
              <View style={styles.tableHeader}>
                <Text style={styles.col1}>Description</Text>
                <Text style={styles.col2}>Sum Insured</Text>
                <Text style={styles.col3}>Premium</Text>
              </View>
              {[
                ["Building", loc.building_si],
                ["Plant & Machinery", loc.plant_machinery_si],
                ["Furniture", loc.furniture_si],
                ["Plate glass", loc.plate_glass_si],
                ["Neon sign", loc.neon_sign_si],
                ["Stocks", loc.stocks_si],
              ].map(([label, si]) => (
                <View key={String(label)} style={styles.tableRow}>
                  <Text style={styles.col1}>{label}</Text>
                  <Text style={styles.col2}>
                    ₹{Number(si).toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.col3}>
                    {label === "Building" ? display(result.locations[i].fire_premium) : ""}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                Money in Transit - Location {i + 1}
              </Text>
              <View style={styles.row}>
                <Text style={styles.label}>Annual carrying limit</Text>
                <Text style={styles.value}>
                  ₹{loc.money.annual_carrying_limit.toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Single carrying limit</Text>
                <Text style={styles.value}>
                  ₹{loc.money.single_carrying_limit.toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Cash in safe / till</Text>
                <Text style={styles.value}>
                  ₹{loc.money.cash_in_safe.toLocaleString("en-IN")} / ₹
                  {loc.money.cash_in_till.toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Money Premium</Text>
                <Text style={styles.value}>
                  {display(result.locations[i].money_premium)}
                </Text>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Summary</Text>
          {[
            ...(result.fire_floater_premium !== "Cover Not Opted"
              ? [["Fire - Floater", result.fire_floater_premium] as const]
              : []),
            ["Burglary", result.sections.burglary_premium],
            ["MBD/EEI", result.sections.mbd_premium],
            ["Plate glass", result.sections.plate_glass_premium],
            ["Neon sign", result.sections.neon_sign_premium],
            ["Public Liability", result.sections.public_liability_premium],
            ["Fidelity", result.sections.fidelity_premium],
          ].map(([label, prem]) => (
            <View key={String(label)} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{display(prem as number | string)}</Text>
            </View>
          ))}
          <Text style={styles.total}>Net Premium: {display(result.net_premium)}</Text>
          <Text style={styles.total}>GST: {display(result.gst)}</Text>
          <Text style={styles.total}>
            Premium (inc GST): {display(result.total_premium)}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>
            Deductibles: Fire 5% min ₹10,000 | Burglary 5% min ₹5,000 | Money 5% min ₹5,000
          </Text>
          <Text style={{ marginTop: 8 }}>
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
