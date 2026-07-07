import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  adminLogout,
  fetchGlobalSettings,
  fetchRateMaster,
  getSession,
  listProposals,
  updateGlobalSettings,
  updateRateMaster,
} from "../lib/supabase/client";
import type { GlobalSettings, RateMasterRow } from "../lib/calculator";
import { computeFireRate } from "../lib/calculator";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [rates, setRates] = useState<RateMasterRow[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [proposals, setProposals] = useState<
    Array<{ reference_number: string; insured_name: string; created_at: string }>
  >([]);
  const [status, setStatus] = useState<string | null>(null);
  const [tab, setTab] = useState<"rates" | "settings" | "proposals">("rates");
  const navigate = useNavigate();

  useEffect(() => {
    getSession().then((session) => {
      if (!session) {
        setAuthenticated(false);
        navigate("/admin/login");
      } else {
        setAuthenticated(true);
        loadData();
      }
    });
  }, [navigate]);

  async function loadData() {
    const [rateData, settingsData, proposalData] = await Promise.all([
      fetchRateMaster(),
      fetchGlobalSettings(),
      listProposals(),
    ]);
    setRates(rateData);
    setSettings(settingsData);
    setProposals(proposalData);
  }

  const recomputeRates = (updatedRates: RateMasterRow[], s: GlobalSettings) => {
    return updatedRates.map((row) => {
      const underSI = s.si_threshold - 1;
      const overSI = s.si_threshold + 1;
      return {
        ...row,
        rate_under_5cr_without_terror: computeFireRate(row, underSI, false, s),
        rate_over_5cr_without_terror: computeFireRate(row, overSI, false, s),
        rate_under_5cr_with_terror: computeFireRate(row, underSI, true, s),
        rate_over_5cr_with_terror: computeFireRate(row, overSI, true, s),
      };
    });
  };

  const handleSaveRates = async () => {
    if (!settings) return;
    try {
      const recomputed = recomputeRates(rates, settings);
      await updateRateMaster(recomputed);
      setRates(recomputed);
      setStatus("Rates updated successfully");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to update rates");
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      await updateGlobalSettings(settings);
      const recomputed = recomputeRates(rates, settings);
      setRates(recomputed);
      setStatus("Settings updated successfully");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to update settings");
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin/login");
  };

  if (authenticated === null) {
    return <p className="text-slate-600">Checking session...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-blue-900">Admin Panel</h2>
        <button type="button" className="btn-secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="flex gap-2">
        {(["rates", "settings", "proposals"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`px-4 py-2 rounded-md text-sm capitalize ${
              tab === t ? "bg-blue-700 text-white" : "bg-white border border-slate-300"
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {status && (
        <p className={`text-sm ${status.includes("success") ? "text-green-700" : "text-red-600"}`}>
          {status}
        </p>
      )}

      {tab === "rates" && (
        <div className="card overflow-x-auto">
          <h3 className="section-title">Rate Master</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Occupancy</th>
                <th className="p-2">Zone</th>
                <th className="p-2">IIB</th>
                <th className="p-2">EQ</th>
                <th className="p-2">STFI</th>
                <th className="p-2">Terror</th>
                <th className="p-2">&lt;5Cr disc</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((row, i) => (
                <tr key={`${row.occupancy}-${row.eq_zone}`} className="border-b">
                  <td className="p-2">{row.occupancy}</td>
                  <td className="p-2">{row.eq_zone}</td>
                  {(["iib_rate", "eq_rate", "stfi_rate", "terrorism_rate", "discount_under_5cr"] as const).map(
                    (field) => (
                      <td key={field} className="p-2">
                        <input
                          type="number"
                          step="0.001"
                          className="w-20"
                          value={row[field]}
                          onChange={(e) => {
                            const updated = [...rates];
                            updated[i] = { ...row, [field]: Number(e.target.value) };
                            setRates(updated);
                          }}
                        />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn-primary mt-4" onClick={handleSaveRates}>
            Save Rates
          </button>
        </div>
      )}

      {tab === "settings" && settings && (
        <div className="card space-y-4 max-w-lg">
          <h3 className="section-title">Global Settings</h3>
          {(
            [
              ["sookshama_discount_pct", "Sookshama discount (%)"],
              ["iib_discount_pct", "IIB discount over 5Cr (%)"],
              ["burglary_rate_pct", "Burglary rate (%)"],
              ["mbd_rate_per_thousand", "MBD rate (per thousand)"],
              ["money_without_terror_rate_pct", "Money rate without terror (%)"],
              ["money_with_terror_rate_pct", "Money rate with terror (%)"],
              ["gst_rate_pct", "GST (%)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label>{label}</label>
              <input
                type="number"
                step="0.001"
                value={settings[key]}
                onChange={(e) =>
                  setSettings({ ...settings, [key]: Number(e.target.value) })
                }
              />
            </div>
          ))}
          <button type="button" className="btn-primary" onClick={handleSaveSettings}>
            Save Settings
          </button>
        </div>
      )}

      {tab === "proposals" && (
        <div className="card overflow-x-auto">
          <h3 className="section-title">Saved Proposals</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Reference</th>
                <th className="p-2">Insured</th>
                <th className="p-2">Created</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p.reference_number} className="border-b">
                  <td className="p-2 font-mono text-xs">{p.reference_number}</td>
                  <td className="p-2">{p.insured_name}</td>
                  <td className="p-2">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="p-2">
                    <Link
                      to={`/load/${p.reference_number}`}
                      className="text-blue-700 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!proposals.length && (
                <tr>
                  <td colSpan={4} className="p-4 text-slate-500">
                    No proposals saved yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
