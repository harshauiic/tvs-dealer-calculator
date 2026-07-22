import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";
import type { ProposalInput, ProposalResult } from "../calculator";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  logoWrap: {
    alignItems: "flex-start",
    marginBottom: 8,
  },
  logo: { width: 280, height: 56, objectFit: "contain" },
  title: { fontSize: 12, fontWeight: "bold", marginBottom: 4, textAlign: "center" },
  subtitle: { fontSize: 8, marginBottom: 12, textAlign: "center", color: "#555" },
  section: {
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#1e3a8a",
  },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: "42%", color: "#444" },
  value: { width: "58%" },
  nestedBox: {
    marginTop: 4,
    marginLeft: 8,
    paddingLeft: 8,
    paddingVertical: 4,
    borderLeftWidth: 2,
    borderLeftColor: "#2563eb",
  },
  nestedBoxGreen: {
    marginTop: 4,
    marginLeft: 8,
    paddingLeft: 8,
    paddingVertical: 4,
    borderLeftWidth: 2,
    borderLeftColor: "#059669",
  },
  nestedTitle: { fontSize: 8, fontWeight: "bold", marginBottom: 3, color: "#1e3a8a" },
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
  descCol: { width: "42%", color: "#444" },
  amountCol: { width: "58%" },
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
  appendixTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1e3a8a",
    textAlign: "center",
  },
  appendixHeader: {
    backgroundColor: "#bfdbfe",
    padding: 4,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 3,
  },
  appendixRow: { flexDirection: "row", marginBottom: 2 },
  appendixLabel: { width: "35%", fontWeight: "bold" },
  appendixValue: { width: "65%" },
  signatureBox: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 36,
  },
  signatureLine: {
    marginTop: 48,
    borderTopWidth: 1,
    borderTopColor: "#333",
    width: "45%",
    alignSelf: "flex-end",
    paddingTop: 4,
    textAlign: "center",
    fontSize: 8,
  },
  footer: { marginTop: 10, fontSize: 7, color: "#666" },
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
  return [...messages];
}

function buildSummaryRows(result: ProposalResult) {
  const rows = [
    ...result.locations.map((loc, i) => ({
      section: `Section 1 - Fire - Location ${i + 1}`,
      si: loc.total_si,
      premium: loc.fire_premium,
    })),
    ...(result.fire_floater_premium !== "Cover Not Opted"
      ? [
          {
            section: "Section 1 - Fire - Floater",
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
      section: `Section 8 - Money - Location ${i + 1}`,
      si: loc.money_total_si,
      premium: loc.money_premium,
    })),
  ];
  return rows.filter((row) => row.premium !== "Cover Not Opted");
}

function coverWithApplicability(
  cover: string,
  applicability: string | null,
): string {
  if (cover !== "Cover Opted" || !applicability) return cover;
  return `${cover} - ${applicability}`;
}

function locationNumbersWhere(
  locations: ProposalInput["locations"],
  predicate: (loc: ProposalInput["locations"][number]) => boolean,
): string {
  const nums = locations
    .map((loc, i) => (predicate(loc) ? i + 1 : null))
    .filter((n): n is number => n !== null);
  if (nums.length === 0) return "Applicable to locations where the respective field is filled";
  return `Applicable to Location${nums.length > 1 ? "s" : ""} ${nums.join(", ")} where the respective field is filled`;
}

function PolicyAppendix() {
  return (
    <View>
      <Text style={styles.appendixTitle}>Policy Terms & Payment Details</Text>

      <Text style={styles.appendixHeader}>Deductibles / Excess</Text>
      {(
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
            "",
            "1% of Sum insured of each machine subject to minimum of Rs. 2500/-",
          ],
          ["EEI", "5% of the claim amount subject to min. Rs. 2500/-"],
          ["Neon Sign", "5% of the claim amount subject to min. Rs. 5000/-"],
          ["Plate glass", "5% of the claim amount subject to min. Rs. 5000/-"],
        ] as const
      ).map(([label, value], index) => (
        <View key={`${label}-${index}`} style={styles.appendixRow}>
          <Text style={styles.appendixLabel}>{label || " "}</Text>
          <Text style={styles.appendixValue}>{value}</Text>
        </View>
      ))}

      <Text style={styles.appendixHeader}>Definitions</Text>
      {(
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
      ).map(([label, value]) => (
        <View key={label} style={styles.appendixRow}>
          <Text style={styles.appendixLabel}>{label}</Text>
          <Text style={styles.appendixValue}>{value}</Text>
        </View>
      ))}

      <Text style={styles.appendixHeader}>Conditions</Text>
      <Text style={{ marginBottom: 2 }}>
        1) Fire section: a. Sum Insured should be less than 50Crs of all Insurable assets
        in the risk location. b. Terms and conditions as per UVUS policy.
      </Text>
      <Text style={{ marginBottom: 2 }}>2) Burglary: a. Theft and RSMD included.</Text>
      <Text style={{ marginBottom: 2 }}>
        3) Money: a. Transit from dealer place to Bank and vice versa. b. Cash carrying
        must be done through an authorised permanent employee of Insured. c. Warranted
        that cash in transit above 1 lacs is carried through private transport. d.
        Warranted that keys are not kept in the shop premises after business hours & also
        the cash lying outside is to be kept in safe after business hours (Safe means
        heavy duty metallic lockable container). e. Transit of money should take place
        within 50kms limit only. f. Cash Carried in either in briefcase, Boxes, Bags and
        in any other types of carrying bags. g. Proper accounting system is available.
      </Text>
      <Text style={{ marginBottom: 2 }}>
        4) Fidelity: a. Only permanent employees are covered. b. Loss of property
        entrusted to any person other than the designated employee of the Insured is not
        covered.
      </Text>
      <Text style={{ marginBottom: 2 }}>
        5) MBD and EEI: a. All machineries and equipments are covered.
      </Text>
      <Text style={{ marginBottom: 4 }}>
        All other terms and conditions as per the respective standard policies.
      </Text>

      <Text style={styles.appendixHeader}>Declaration</Text>
      <Text style={{ marginBottom: 2 }}>I hereby declare that:</Text>
      <Text style={{ marginBottom: 2 }}>1. All information provided by me is true.</Text>
      <Text style={{ marginBottom: 2 }}>
        2. There are nil claims in the past 3 years.
      </Text>
      <Text style={{ marginBottom: 4 }}>
        3. We are Insuring all the assets and no selection is done.
      </Text>

      <Text style={styles.appendixHeader}>Payment details</Text>
      {(
        [
          ["Beneficiary name", "United India Insurance Co Ltd"],
          ["Account No", "200999095210013100"],
          ["IFSC Code", "INDB0000007"],
          ["Bank name", "IndusInd Bank Ltd"],
          ["Branch", "Nungambakkam, Chennai"],
          ["UTR", ""],
          ["DATE", ""],
        ] as const
      ).map(([label, value]) => (
        <View key={label} style={styles.appendixRow}>
          <Text style={styles.appendixLabel}>{label}</Text>
          <Text style={styles.appendixValue}>{value || "________________"}</Text>
        </View>
      ))}

      <View style={styles.signatureBox} wrap={false}>
        <Text style={styles.signatureLabel}>Signature of Insured with Seal</Text>
        <Text style={styles.signatureLine}>Signature / Seal</Text>
      </View>
    </View>
  );
}

function ProposalDocument({
  input,
  result,
  logoSrc,
  referenceNumber,
}: {
  input: ProposalInput;
  result: ProposalResult;
  logoSrc: string;
  referenceNumber?: string;
}) {
  const today = new Date().toLocaleDateString("en-IN");
  const notes = collectNotes(result);
  const summaryRows = buildSummaryRows(result);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.logoWrap}>
          <Image src={logoSrc} style={styles.logo} />
        </View>
        <Text style={styles.title}>TVS MOTOR DEALERS PACKAGE POLICY</Text>
        <Text style={styles.subtitle}>Proposal Date: {today}</Text>
        {referenceNumber ? (
          <Text style={styles.subtitle}>Proposal Reference: {referenceNumber}</Text>
        ) : null}

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
            {loc.no_expiring_policy ? (
              <View style={styles.row}>
                <Text style={styles.label}>Expiring policy</Text>
                <Text style={styles.value}>
                  There is no expiring policy for this location
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>Insurance company</Text>
                  <Text style={styles.value}>{loc.insurance_company || "-"}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Period of cover</Text>
                  <Text style={styles.value}>
                    {loc.period_start && loc.period_end
                      ? `${loc.period_start} to ${loc.period_end}`
                      : loc.period_of_cover || "-"}
                  </Text>
                </View>
              </>
            )}

            <Text style={{ fontWeight: "bold", marginTop: 6, marginBottom: 3 }}>
              Section 1 - Fire Sum Insured
            </Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.descCol, styles.tableHeaderText]}>Description</Text>
              <Text style={[styles.amountCol, styles.tableHeaderText]}>Sum Insured</Text>
            </View>
            {(
              [
                ["Building", formatAmount(loc.building_si)],
                ["Plant & Machinery", formatAmount(loc.plant_machinery_si)],
                ["Furniture", formatAmount(loc.furniture_si)],
                ["Plate glass", formatAmount(loc.plate_glass_si)],
                ["Neon sign", formatAmount(loc.neon_sign_si)],
                [
                  "Stocks",
                  input.floater_cover.enabled
                    ? "As per floater"
                    : formatAmount(loc.stocks_si),
                ],
                [
                  "Total Fire SI",
                  formatAmount(result.locations[i]?.total_si ?? 0),
                ],
              ] as const
            ).map(([label, si]) => (
              <View key={label} style={styles.tableRow}>
                <Text
                  style={[
                    styles.descCol,
                    label === "Total Fire SI" ? { fontWeight: "bold" } : {},
                  ]}
                >
                  {label}
                </Text>
                <Text
                  style={[
                    styles.amountCol,
                    label === "Total Fire SI" ? { fontWeight: "bold" } : {},
                  ]}
                >
                  {si}
                </Text>
              </View>
            ))}

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
          </View>
        ))}

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
                <Text style={styles.label}>Stock floater sum insured required</Text>
                <Text style={styles.value}>
                  {formatAmount(input.floater_cover.floater_sum_insured)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Maximum stock sum insured per location</Text>
                <Text style={styles.value}>
                  {formatAmount(input.floater_cover.max_sum_insured_per_location)}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Sections</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Section 2 - Burglary</Text>
            <Text style={styles.value}>
              {coverWithApplicability(
                input.sections.burglary,
                input.sections.burglary === "Cover Opted" ? "All locations" : null,
              )}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Section 3 - MBD/EEI</Text>
            <Text style={styles.value}>
              {coverWithApplicability(
                input.sections.mbd_eei,
                input.sections.mbd_eei === "Cover Opted"
                  ? locationNumbersWhere(
                      input.locations,
                      (loc) => loc.plant_machinery_si > 0,
                    )
                  : null,
              )}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Section 4 - Plate glass</Text>
            <Text style={styles.value}>
              {coverWithApplicability(
                input.sections.plate_glass,
                input.sections.plate_glass === "Cover Opted"
                  ? locationNumbersWhere(
                      input.locations,
                      (loc) => loc.plate_glass_si > 0,
                    )
                  : null,
              )}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Section 5 - Neon sign</Text>
            <Text style={styles.value}>
              {coverWithApplicability(
                input.sections.neon_sign,
                input.sections.neon_sign === "Cover Opted"
                  ? locationNumbersWhere(
                      input.locations,
                      (loc) => loc.neon_sign_si > 0,
                    )
                  : null,
              )}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Section 6 - Public Liability</Text>
            <Text style={styles.value}>
              {coverWithApplicability(
                input.sections.public_liability,
                input.sections.public_liability === "Cover Opted"
                  ? "All locations"
                  : null,
              )}
            </Text>
          </View>
          {input.sections.public_liability === "Cover Opted" && (
            <View style={styles.nestedBox}>
              <Text style={styles.nestedTitle}>Public Liability details</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Public Liability SI</Text>
                <Text style={styles.value}>
                  {formatAmount(input.sections.public_liability_si)}
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.row, { marginTop: 4 }]}>
            <Text style={styles.label}>Section 7 - Fidelity</Text>
            <Text style={styles.value}>
              {coverWithApplicability(
                input.sections.fidelity,
                input.sections.fidelity === "Cover Opted" ? "All locations" : null,
              )}
            </Text>
          </View>
          {input.sections.fidelity === "Cover Opted" && (
            <View style={styles.nestedBoxGreen}>
              <Text style={[styles.nestedTitle, { color: "#047857" }]}>
                Fidelity details
              </Text>
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
            </View>
          )}
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

        <PolicyAppendix />
      </Page>
    </Document>
  );
}

export async function downloadProposalPdf(
  input: ProposalInput,
  result: ProposalResult,
  referenceNumber?: string,
) {
  const logoPath = `${import.meta.env.BASE_URL}uiic-header.png`;
  const logoResponse = await fetch(logoPath);
  const logoBlob = await logoResponse.blob();
  const logoSrc = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(logoBlob);
  });

  const blob = await pdf(
    <ProposalDocument
      input={input}
      result={result}
      logoSrc={logoSrc}
      referenceNumber={referenceNumber}
    />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const fileRef = referenceNumber?.replace(/\s+/g, "-") || "draft";
  a.download = `UIIC-TVS-Proposal-${fileRef}-${input.insured_name.replace(/\s+/g, "-") || "draft"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
