import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CalculatorPage from "./CalculatorPage";
import { loadProposal } from "../lib/supabase/client";
import type { ProposalInput } from "../lib/calculator";

export default function LoadProposalPage() {
  const { reference: paramRef } = useParams();
  const [reference, setReference] = useState(paramRef ?? "");
  const [initialInput, setInitialInput] = useState<ProposalInput | undefined>();
  const [loadedRef, setLoadedRef] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (paramRef) {
      loadByReference(paramRef);
    }
  }, [paramRef]);

  async function loadByReference(ref: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await loadProposal(ref);
      if (!data) {
        setError("Proposal not found");
        return;
      }
      const payload = data.payload ?? data;
      setInitialInput(payload.input as ProposalInput);
      setLoadedRef(ref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  }

  if (initialInput && loadedRef) {
    return <CalculatorPage initialInput={initialInput} initialReference={loadedRef} />;
  }

  return (
    <div className="card max-w-lg space-y-4">
      <h2 className="section-title">Load Saved Proposal</h2>
      <div>
        <label>Reference Number</label>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="TVSM-YYYYMMDD-XXXXXX"
        />
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={loading || !reference.trim()}
        onClick={() => {
          navigate(`/load/${reference.trim()}`);
          loadByReference(reference.trim());
        }}
      >
        {loading ? "Loading..." : "Load Proposal"}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <Link to="/" className="text-sm text-blue-700 hover:underline block">
        Back to calculator
      </Link>
    </div>
  );
}
