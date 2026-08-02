import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  adminLogout,
  deleteProposals,
  fetchGlobalSettings,
  fetchPincodeMap,
  fetchRateMaster,
  getSession,
  listProposals,
  updateGlobalSettings,
  updateRateMaster,
} from "../lib/supabase/client";
import type {
  GlobalSettings,
  ProposalInput,
  RateMasterRow,
} from "../lib/calculator";
import { computeFireRate } from "../lib/calculator";
import { downloadProposalPdf } from "../lib/pdf/proposalPdf";
import {
  downloadPolicyDocx,
  type PolicyGenerationDetails,
} from "../lib/policy/generatePolicyDocx";
import { resolveProposalForExport } from "../lib/policy/resolveProposalForExport";
import GeneratePolicyModal from "../components/GeneratePolicyModal";
import CopySumInsuredModal from "../components/CopySumInsuredModal";

const RATE_SETTING_KEYS = [
  "burglary_rate_pct",
  "mbd_rate_per_thousand",
  "money_without_terror_rate_pct",
  "money_with_terror_rate_pct",
  "gst_rate_pct",
] as const satisfies ReadonlyArray<keyof GlobalSettings>;

const LIMITATION_KEYS = [
  "max_location_si",
  "limit_public_liability_si",
  "limit_fidelity_employees",
  "limit_fidelity_floater_si",
  "limit_fidelity_per_employee",
  "limit_money_annual_carrying",
  "limit_money_single_carrying",
  "limit_money_cash_in_safe",
  "limit_money_cash_in_till",
] as const satisfies ReadonlyArray<keyof GlobalSettings>;

type ProposalListItem = {
  id: string;
  reference_number: string;
  insured_name: string;
  created_at: string;
};

type ProposalSortKey = "reference_number" | "created_at";
type SortDir = "asc" | "desc";

function proposalNumberValue(reference: string): number {
  const match = reference.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : Number.NaN;
}

function compareProposals(
  a: ProposalListItem,
  b: ProposalListItem,
  key: ProposalSortKey,
  dir: SortDir,
): number {
  let cmp = 0;
  if (key === "created_at") {
    cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  } else {
    const aNum = proposalNumberValue(a.reference_number);
    const bNum = proposalNumberValue(b.reference_number);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) cmp = aNum - bNum;
    else cmp = a.reference_number.localeCompare(b.reference_number);
  }
  return dir === "asc" ? cmp : -cmp;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [rates, setRates] = useState<RateMasterRow[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [selectedProposalIds, setSelectedProposalIds] = useState<Set<string>>(
    new Set(),
  );
  const [deletingProposals, setDeletingProposals] = useState(false);
  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalSortKey, setProposalSortKey] =
    useState<ProposalSortKey>("created_at");
  const [proposalSortDir, setProposalSortDir] = useState<SortDir>("desc");
  const [pincodeMap, setPincodeMap] = useState<Map<string, number>>(new Map());
  const [actionBusyRef, setActionBusyRef] = useState<string | null>(null);
  const [generateTarget, setGenerateTarget] = useState<ProposalListItem | null>(
    null,
  );
  const [generatingPolicy, setGeneratingPolicy] = useState(false);
  const [copyTarget, setCopyTarget] = useState<{
    proposal: ProposalListItem;
    input: ProposalInput;
  } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [tab, setTab] = useState<"rates" | "settings" | "limitations" | "proposals">(
    "rates",
  );
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
    const [rateData, settingsData, proposalData, pincodes] = await Promise.all([
      fetchRateMaster(),
      fetchGlobalSettings(),
      listProposals(),
      fetchPincodeMap(),
    ]);
    setRates(rateData);
    setSettings(settingsData);
    setProposals(proposalData as ProposalListItem[]);
    setPincodeMap(pincodes);
    setSelectedProposalIds(new Set());
  }

  const toggleProposalSelection = (id: string) => {
    setSelectedProposalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllProposals = () => {
    setSelectedProposalIds((prev) => {
      if (
        filteredProposals.length > 0 &&
        filteredProposals.every((p) => prev.has(p.id))
      ) {
        return new Set();
      }
      return new Set(filteredProposals.map((p) => p.id));
    });
  };

  const handleDeleteSelectedProposals = async () => {
    if (!selectedProposalIds.size) return;
    const confirmed = window.confirm(
      `Delete ${selectedProposalIds.size} selected proposal(s)? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingProposals(true);
    setStatus(null);
    try {
      await deleteProposals([...selectedProposalIds]);
      setStatus(`Deleted ${selectedProposalIds.size} proposal(s)`);
      await loadData();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to delete proposals");
    } finally {
      setDeletingProposals(false);
    }
  };

  const handleDownloadProposal = async (proposal: ProposalListItem) => {
    if (!settings) return;
    setActionBusyRef(proposal.reference_number);
    setStatus(null);
    try {
      const { input, result, reference } = await resolveProposalForExport(
        proposal.reference_number,
        rates,
        settings,
        pincodeMap,
      );
      await downloadProposalPdf(input, result, reference);
      setStatus(`Downloaded proposal ${reference}`);
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Failed to download proposal",
      );
    } finally {
      setActionBusyRef(null);
    }
  };

  const handleGeneratePolicy = async (details: PolicyGenerationDetails) => {
    if (!settings || !generateTarget) return;
    setGeneratingPolicy(true);
    setStatus(null);
    try {
      const { input, result } = await resolveProposalForExport(
        generateTarget.reference_number,
        rates,
        settings,
        pincodeMap,
      );
      await downloadPolicyDocx(input, result, details);
      setStatus(`Generated policy for ${generateTarget.reference_number}`);
      setGenerateTarget(null);
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Failed to generate policy",
      );
    } finally {
      setGeneratingPolicy(false);
    }
  };

  const handleOpenCopySumInsured = async (proposal: ProposalListItem) => {
    if (!settings) return;
    setActionBusyRef(proposal.reference_number);
    setStatus(null);
    try {
      const { input } = await resolveProposalForExport(
        proposal.reference_number,
        rates,
        settings,
        pincodeMap,
      );
      setCopyTarget({ proposal, input });
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "Failed to load proposal for copy",
      );
    } finally {
      setActionBusyRef(null);
    }
  };

  const filteredProposals = useMemo(() => {
    const q = proposalSearch.trim().toLowerCase();
    const filtered = !q
      ? [...proposals]
      : proposals.filter(
          (p) =>
            p.reference_number.toLowerCase().includes(q) ||
            p.insured_name.toLowerCase().includes(q),
        );
    return filtered.sort((a, b) =>
      compareProposals(a, b, proposalSortKey, proposalSortDir),
    );
  }, [proposals, proposalSearch, proposalSortKey, proposalSortDir]);

  const toggleProposalSort = (key: ProposalSortKey) => {
    if (proposalSortKey === key) {
      setProposalSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setProposalSortKey(key);
      setProposalSortDir(key === "created_at" ? "desc" : "asc");
    }
  };

  const sortIndicator = (key: ProposalSortKey) => {
    if (proposalSortKey !== key) return "";
    return proposalSortDir === "asc" ? " ↑" : " ↓";
  };

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
      await updateGlobalSettings(settings, RATE_SETTING_KEYS);
      const recomputed = recomputeRates(rates, settings);
      setRates(recomputed);
      setStatus("Settings updated successfully");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to update settings");
    }
  };

  const handleSaveLimitations = async () => {
    if (!settings) return;
    try {
      await updateGlobalSettings(settings, LIMITATION_KEYS);
      setStatus("Limitations updated successfully");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to update limitations");
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

      <div className="flex gap-2 flex-wrap">
        {(["rates", "settings", "limitations", "proposals"] as const).map((t) => (
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
                <th className="p-2">&gt;5Cr IIB discount (%)</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((row, i) => (
                <tr key={`${row.occupancy}-${row.eq_zone}`} className="border-b">
                  <td className="p-2">{row.occupancy}</td>
                  <td className="p-2">{row.eq_zone}</td>
                  {(
                    [
                      "iib_rate",
                      "eq_rate",
                      "stfi_rate",
                      "terrorism_rate",
                      "discount_under_5cr",
                      "discount_iib_over_5cr",
                    ] as const
                  ).map((field) => (
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
                  ))}
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

      {tab === "limitations" && settings && (
        <div className="card space-y-6 max-w-2xl">
          <h3 className="section-title">Limitations</h3>
          <p className="text-sm text-slate-600">
            Configure maximum allowed values. Entered values above these limits will show an
            error with the configured maximum.
          </p>

          {(
            [
              [
                "Section 1 - Fire Sum Insured",
                [["max_location_si", "Total Fire Sum Insured (per location)"]],
              ],
              [
                "Section 6 - Public Liability",
                [["limit_public_liability_si", "Public Liability Sum Insured"]],
              ],
              [
                "Section 7 - Fidelity",
                [
                  ["limit_fidelity_employees", "No of permanent employees"],
                  ["limit_fidelity_floater_si", "Floater SI"],
                  ["limit_fidelity_per_employee", "Per employee limit"],
                ],
              ],
              [
                "Section 8 - Money in transit",
                [
                  ["limit_money_annual_carrying", "Annual Carrying limit"],
                  ["limit_money_single_carrying", "Single carrying limit"],
                  ["limit_money_cash_in_safe", "Cash in safe"],
                  ["limit_money_cash_in_till", "Cash in till"],
                ],
              ],
            ] as const
          ).map(([sectionTitle, fields]) => (
            <div key={sectionTitle} className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800">{sectionTitle}</h4>
              {sectionTitle === "Section 1 - Fire Sum Insured" && (
                <p className="text-xs text-slate-500">
                  Without floater: total of all Fire SI fields at a location must not exceed
                  this value. With floater: Fire SI fields + Maximum sum insured per location
                  must not exceed this value.
                </p>
              )}
              {fields.map(([key, label]) => (
                <div key={key}>
                  <label>{label}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={settings[key] === 0 ? "" : String(settings[key])}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^\d]/g, "");
                      setSettings({
                        ...settings,
                        [key]: cleaned === "" ? 0 : Number(cleaned),
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          ))}

          <button type="button" className="btn-primary" onClick={handleSaveLimitations}>
            Save Limitations
          </button>
        </div>
      )}

      {tab === "proposals" && (
        <div className="card overflow-x-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="section-title mb-0 border-0 pb-0">Saved Proposals</h3>
            <button
              type="button"
              className="btn-danger"
              disabled={!selectedProposalIds.size || deletingProposals}
              onClick={handleDeleteSelectedProposals}
            >
              {deletingProposals
                ? "Deleting..."
                : `Delete selected (${selectedProposalIds.size})`}
            </button>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label>Search</label>
              <input
                value={proposalSearch}
                onChange={(e) => setProposalSearch(e.target.value)}
                placeholder="Search by reference or insured name"
              />
            </div>
            <p className="text-xs text-slate-500 pb-2">
              Showing {filteredProposals.length} of {proposals.length}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredProposals.length > 0 &&
                      filteredProposals.every((p) => selectedProposalIds.has(p.id))
                    }
                    onChange={toggleSelectAllProposals}
                    aria-label="Select all proposals"
                  />
                </th>
                <th className="p-2">
                  <button
                    type="button"
                    className="font-semibold hover:text-blue-800"
                    onClick={() => toggleProposalSort("reference_number")}
                  >
                    Proposal No.{sortIndicator("reference_number")}
                  </button>
                </th>
                <th className="p-2">Insured</th>
                <th className="p-2">
                  <button
                    type="button"
                    className="font-semibold hover:text-blue-800"
                    onClick={() => toggleProposalSort("created_at")}
                  >
                    Date{sortIndicator("created_at")}
                  </button>
                </th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedProposalIds.has(p.id)}
                      onChange={() => toggleProposalSelection(p.id)}
                      aria-label={`Select ${p.reference_number}`}
                    />
                  </td>
                  <td className="p-2 font-mono text-xs">{p.reference_number}</td>
                  <td className="p-2">{p.insured_name}</td>
                  <td className="p-2">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Link
                        to={`/load/${p.reference_number}`}
                        className="text-blue-700 hover:underline text-xs"
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        className="btn-secondary text-xs px-2 py-1"
                        disabled={actionBusyRef === p.reference_number}
                        onClick={() => handleDownloadProposal(p)}
                      >
                        {actionBusyRef === p.reference_number
                          ? "Downloading..."
                          : "Download Proposal"}
                      </button>
                      <button
                        type="button"
                        className="btn-primary text-xs px-2 py-1"
                        onClick={() => setGenerateTarget(p)}
                      >
                        Generate Policy
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs px-2 py-1"
                        disabled={actionBusyRef === p.reference_number}
                        onClick={() => handleOpenCopySumInsured(p)}
                      >
                        {actionBusyRef === p.reference_number
                          ? "Loading..."
                          : "Copy to clipboard"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredProposals.length && (
                <tr>
                  <td colSpan={5} className="p-4 text-slate-500">
                    {proposals.length
                      ? "No proposals match your search."
                      : "No proposals saved yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {generateTarget && (
        <GeneratePolicyModal
          insuredName={generateTarget.insured_name}
          referenceNumber={generateTarget.reference_number}
          busy={generatingPolicy}
          onCancel={() => {
            if (!generatingPolicy) setGenerateTarget(null);
          }}
          onGenerate={handleGeneratePolicy}
        />
      )}

      {copyTarget && (
        <CopySumInsuredModal
          input={copyTarget.input}
          insuredName={copyTarget.proposal.insured_name}
          referenceNumber={copyTarget.proposal.reference_number}
          onClose={() => setCopyTarget(null)}
        />
      )}
    </div>
  );
}
