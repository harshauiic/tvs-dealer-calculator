import { Fragment } from "react";
import { formatCurrency } from "../lib/calculator";
import type { ProposalResult } from "../lib/calculator";

interface Props {
  result: ProposalResult;
}

function display(value: number | string) {
  return typeof value === "number" ? formatCurrency(value) : value;
}

export default function PremiumSummary({ result }: Props) {
  return (
    <div className="card space-y-4">
      <h2 className="section-title">Premium Summary</h2>

      {result.referral_required && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-3 text-sm">
          One or more locations require office referral due to claims history.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-600">
              <th className="py-2 pr-4">Section</th>
              <th className="py-2 pr-4">Premium</th>
            </tr>
          </thead>
          <tbody>
            {result.locations.map((loc, i) => (
              <Fragment key={loc.id}>
                <tr className="border-b">
                  <td className="py-2 pr-4">Fire - Location {i + 1}</td>
                  <td className="py-2">{display(loc.fire_premium)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Money - Location {i + 1}</td>
                  <td className="py-2">{display(loc.money_premium)}</td>
                </tr>
              </Fragment>
            ))}
            <tr className="border-b">
              <td className="py-2 pr-4">Burglary</td>
              <td className="py-2">{display(result.sections.burglary_premium)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">MBD/EEI</td>
              <td className="py-2">{display(result.sections.mbd_premium)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">Plate glass</td>
              <td className="py-2">{display(result.sections.plate_glass_premium)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">Neon sign</td>
              <td className="py-2">{display(result.sections.neon_sign_premium)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">Public Liability</td>
              <td className="py-2">{display(result.sections.public_liability_premium)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">Fidelity</td>
              <td className="py-2">{display(result.sections.fidelity_premium)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t pt-4 space-y-2 text-base">
        <div className="flex justify-between">
          <span className="font-medium">Net Premium</span>
          <span>{display(result.net_premium)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">GST</span>
          <span>{display(result.gst)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-blue-900">
          <span>Premium (inc GST)</span>
          <span>{display(result.total_premium)}</span>
        </div>
      </div>
    </div>
  );
}
