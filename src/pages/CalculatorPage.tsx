import { useMemo, useState } from "react";
import LocationForm from "../components/LocationForm";
import GlobalSectionsForm from "../components/GlobalSectionsForm";
import PremiumSummary from "../components/PremiumSummary";
import {
  calcProposal,
  createEmptyLocation,
  defaultGlobalSections,
  generateReferenceNumber,
  lookupEqZone,
} from "../lib/calculator";
import type { ProposalInput } from "../lib/calculator";
import { saveProposal } from "../lib/supabase/client";
import { downloadProposalPdf } from "../lib/pdf/proposalPdf";
import { useCalculatorData } from "../hooks/useCalculatorData";

interface Props {
  initialInput?: ProposalInput;
  initialReference?: string;
}

export default function CalculatorPage({ initialInput, initialReference }: Props) {
  const { rateMaster, settings, pincodeMap, loading, error } = useCalculatorData();
  const [input, setInput] = useState<ProposalInput>(
    initialInput ?? {
      insured_name: "",
      communication_address: "",
      locations: [createEmptyLocation()],
      sections: defaultGlobalSections(),
    },
  );
  const [reference, setReference] = useState(initialReference ?? "");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => {
    if (!settings || !rateMaster.length) return null;
    return calcProposal(input, rateMaster, pincodeMap, settings);
  }, [input, rateMaster, pincodeMap, settings]);

  const addLocation = () => {
    setInput((prev) => ({
      ...prev,
      locations: [...prev.locations, createEmptyLocation()],
    }));
  };

  const updateLocation = (index: number, updated: ProposalInput["locations"][0]) => {
    setInput((prev) => ({
      ...prev,
      locations: prev.locations.map((l, i) => (i === index ? updated : l)),
    }));
  };

  const removeLocation = (index: number) => {
    setInput((prev) => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!result || !settings) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      const ref = reference || generateReferenceNumber();
      await saveProposal(input.insured_name, ref, { input, result }, {
        rateMaster,
        settings,
      });
      setReference(ref);
      setSaveStatus(`Proposal saved. Reference: ${ref}`);
    } catch (err) {
      setSaveStatus(err instanceof Error ? err.message : "Failed to save proposal");
    } finally {
      setSaving(false);
    }
  };

  const handlePdf = async () => {
    if (!result) return;
    await downloadProposalPdf(input, result);
  };

  if (loading) return <p className="text-slate-600">Loading calculator data...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="space-y-6">
      {reference && (
        <div className="card bg-blue-50 border-blue-200 text-blue-900 text-sm">
          Proposal reference: <strong>{reference}</strong>
        </div>
      )}

      <div className="card space-y-4">
        <h2 className="section-title">Insured Details</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label>Insured Name</label>
            <input
              value={input.insured_name}
              onChange={(e) =>
                setInput((prev) => ({ ...prev, insured_name: e.target.value }))
              }
            />
          </div>
          <div>
            <label>Communication Address</label>
            <textarea
              rows={2}
              value={input.communication_address}
              onChange={(e) =>
                setInput((prev) => ({
                  ...prev,
                  communication_address: e.target.value,
                }))
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-blue-900">Risk Locations</h2>
          <button type="button" className="btn-primary" onClick={addLocation}>
            + Add Location
          </button>
        </div>
        {input.locations.map((loc, index) => (
          <LocationForm
            key={loc.id}
            location={loc}
            index={index}
            eqZone={lookupEqZone(loc.pincode, pincodeMap)}
            onChange={(updated) => updateLocation(index, updated)}
            onRemove={() => removeLocation(index)}
            canRemove={input.locations.length > 1}
          />
        ))}
      </div>

      <GlobalSectionsForm
        sections={input.sections}
        onChange={(sections) => setInput((prev) => ({ ...prev, sections }))}
      />

      {result && <PremiumSummary result={result} />}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={saving || !result}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save Proposal"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={!result}
          onClick={handlePdf}
        >
          Download PDF
        </button>
      </div>

      {saveStatus && (
        <p className={`text-sm ${saveStatus.includes("saved") ? "text-green-700" : "text-red-600"}`}>
          {saveStatus}
        </p>
      )}
    </div>
  );
}
