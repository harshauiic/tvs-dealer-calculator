import { useMemo, useState } from "react";
import type { ProposalInput } from "../lib/calculator";
import { buildSumInsuredClipboardText } from "../lib/policy/buildSumInsuredClipboardText";

interface Props {
  input: ProposalInput;
  insuredName: string;
  referenceNumber: string;
  onClose: () => void;
}

export default function CopySumInsuredModal({
  input,
  insuredName,
  referenceNumber,
  onClose,
}: Props) {
  const text = useMemo(() => buildSumInsuredClipboardText(input), [input]);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function handleCopy() {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Could not copy automatically. Select the text and copy manually.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">
              Copy Sum Insured
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {referenceNumber} · {insuredName}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Location-wise sum insured for opted sections only.
            </p>
          </div>
          <button
            type="button"
            className="text-slate-500 hover:text-slate-800 text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="px-5 py-3 overflow-y-auto flex-1 min-h-0">
          <pre className="text-xs sm:text-sm whitespace-pre-wrap font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-md p-3">
            {text}
          </pre>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 p-5 pt-3 border-t border-slate-100">
          <div className="text-sm">
            {copied && (
              <span className="text-emerald-700 font-medium">Copied!</span>
            )}
            {copyError && <span className="text-red-600">{copyError}</span>}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn-primary" onClick={handleCopy}>
              Copy to clipboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
