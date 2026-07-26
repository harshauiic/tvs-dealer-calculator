import { useMemo, useState, type FormEvent } from "react";
import type { PolicyGenerationDetails } from "../lib/policy/generatePolicyDocx";

interface Props {
  insuredName: string;
  referenceNumber: string;
  busy?: boolean;
  onCancel: () => void;
  onGenerate: (details: PolicyGenerationDetails) => Promise<void>;
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addOneYear(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const next = new Date(y + 1, m - 1, d);
  // end date typically day before anniversary in sample; use +1 year - 1 day
  next.setDate(next.getDate() - 1);
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const dd = String(next.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function GeneratePolicyModal({
  insuredName,
  referenceNumber,
  busy = false,
  onCancel,
  onGenerate,
}: Props) {
  const defaults = useMemo(() => {
    const start = todayIso();
    return {
      policyNumber: "",
      previousPolicyNumber: "",
      startDate: start,
      startTime: "00:00",
      endDate: addOneYear(start),
    };
  }, []);

  const [policyNumber, setPolicyNumber] = useState(defaults.policyNumber);
  const [previousPolicyNumber, setPreviousPolicyNumber] = useState(
    defaults.previousPolicyNumber,
  );
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [startTime, setStartTime] = useState(defaults.startTime);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!policyNumber.trim()) {
      setError("Policy Number is required");
      return;
    }
    if (!startDate) {
      setError("Start Date is required");
      return;
    }
    if (!startTime) {
      setError("Start Time is required");
      return;
    }
    if (!endDate) {
      setError("End Date is required");
      return;
    }
    if (endDate < startDate) {
      setError("End Date must be on or after Start Date");
      return;
    }
    setError(null);
    await onGenerate({
      policyNumber: policyNumber.trim(),
      previousPolicyNumber: previousPolicyNumber.trim(),
      startDate,
      startTime,
      endDate,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">
              Generate Policy
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {referenceNumber} · {insuredName}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Builds a Word schedule in-app (no reference template).
            </p>
          </div>
          <button
            type="button"
            className="text-slate-500 hover:text-slate-800 text-sm"
            onClick={onCancel}
            disabled={busy}
          >
            Close
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label>
              Policy Number <span className="text-red-600">*</span>
            </label>
            <input
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              placeholder="e.g. 0131002626P105650719"
              required
            />
          </div>
          <div>
            <label>Previous Policy Number (If any)</label>
            <input
              value={previousPolicyNumber}
              onChange={(e) => setPreviousPolicyNumber(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label>
                Start Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value) setEndDate(addOneYear(e.target.value));
                }}
                required
              />
            </div>
            <div>
              <label>
                Start Time <span className="text-red-600">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label>
                End Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label>End Time</label>
              <input type="text" value="Midnight" disabled readOnly />
              <p className="text-xs text-slate-500 mt-1">Fixed at midnight</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Generating..." : "Generate Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
