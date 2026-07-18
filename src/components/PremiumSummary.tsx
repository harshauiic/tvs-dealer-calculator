import { formatCurrency } from "../lib/calculator";
import type { ProposalResult } from "../lib/calculator";

interface Props {
  result: ProposalResult;
  premiumReady?: boolean;
}

const STATUS_MESSAGES = new Set([
  "Cover Not Opted",
  "Kindly refer proposal to office",
]);

function displayPremium(value: number | string) {
  if (typeof value === "number") return formatCurrency(value);
  if (STATUS_MESSAGES.has(value)) return value;
  return "—";
}

function displaySI(value: number, premium: number | string) {
  if (premium === "Cover Not Opted") return "—";
  if (!value) return "—";
  return formatCurrency(value);
}

function collectPremiumMessages(result: ProposalResult): string[] {
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

interface SummaryRow {
  key: string;
  section: string;
  sumInsured: number;
  premium: number | string;
}

function buildSummaryRows(result: ProposalResult): SummaryRow[] {
  const rows: SummaryRow[] = [];

  result.locations.forEach((loc, i) => {
    rows.push({
      key: `fire-${loc.id}`,
      section: `Fire - Location ${i + 1}`,
      sumInsured: loc.total_si,
      premium: loc.fire_premium,
    });
  });

  if (result.fire_floater_premium !== "Cover Not Opted") {
    rows.push({
      key: "fire-floater",
      section: "Fire - Floater",
      sumInsured: result.fire_floater_si,
      premium: result.fire_floater_premium,
    });
  }

  rows.push(
    {
      key: "burglary",
      section: "Section 2 - Burglary",
      sumInsured: result.sections.burglary_si,
      premium: result.sections.burglary_premium,
    },
    {
      key: "mbd",
      section: "Section 3 - MBD/EEI",
      sumInsured: result.sections.mbd_si,
      premium: result.sections.mbd_premium,
    },
    {
      key: "plate",
      section: "Section 4 - Plate glass",
      sumInsured: result.sections.plate_glass_si,
      premium: result.sections.plate_glass_premium,
    },
    {
      key: "neon",
      section: "Section 5 - Neon sign",
      sumInsured: result.sections.neon_sign_si,
      premium: result.sections.neon_sign_premium,
    },
    {
      key: "pl",
      section: "Section 6 - Public Liability",
      sumInsured: result.sections.public_liability_si,
      premium: result.sections.public_liability_premium,
    },
    {
      key: "fidelity",
      section: "Section 7 - Fidelity",
      sumInsured: result.sections.fidelity_si,
      premium: result.sections.fidelity_premium,
    },
  );

  result.locations.forEach((loc, i) => {
    rows.push({
      key: `money-${loc.id}`,
      section: `Money - Location ${i + 1}`,
      sumInsured: loc.money_total_si,
      premium: loc.money_premium,
    });
  });

  return rows.filter((row) => row.premium !== "Cover Not Opted");
}

export default function PremiumSummary({ result, premiumReady = true }: Props) {
  const messages = collectPremiumMessages(result);
  const rows = buildSummaryRows(result);

  return (
    <div className="card space-y-4">
      <h2 className="section-title">Premium Summary</h2>

      {result.referral_required && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-3 text-sm">
          One or more locations require office referral due to claims history.
        </div>
      )}

      {messages.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 text-sm space-y-1">
          {messages.map((msg) => (
            <p key={msg}>{msg}</p>
          ))}
        </div>
      )}

      {!premiumReady ? (
        <p className="text-sm text-slate-600">
          Fix the errors above to calculate premium.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="py-2 pr-4">Section</th>
                  <th className="py-2 pr-4">Sum Insured</th>
                  <th className="py-2 pr-4">Premium</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b">
                    <td className="py-2 pr-4">{row.section}</td>
                    <td className="py-2 pr-4">
                      {displaySI(row.sumInsured, row.premium)}
                    </td>
                    <td className="py-2">{displayPremium(row.premium)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t pt-4 space-y-2 text-base">
            <div className="flex justify-between">
              <span className="font-medium">Net Premium</span>
              <span>{displayPremium(result.net_premium)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">GST</span>
              <span>{displayPremium(result.gst)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-blue-900">
              <span>Premium (inc GST)</span>
              <span>{displayPremium(result.total_premium)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
