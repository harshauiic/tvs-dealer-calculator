import { useMemo, useState } from "react";
import AmountInput from "../components/AmountInput";
import LocationForm from "../components/LocationForm";
import GlobalSectionsForm from "../components/GlobalSectionsForm";
import PremiumSummary from "../components/PremiumSummary";
import {
  calcProposal,
  createEmptyLocation,
  defaultProposalInput,
  lookupEqZone,
  normalizeProposalInput,
  syncSectionsWithLocations,
} from "../lib/calculator";
import type { ProposalInput, TerrorismScope } from "../lib/calculator";
import { downloadProposalPdf } from "../lib/pdf/proposalPdf";
import { useCalculatorData } from "../hooks/useCalculatorData";

interface Props {
  initialInput?: ProposalInput;
  initialReference?: string;
}

export default function CalculatorPage({ initialInput, initialReference }: Props) {
  const { rateMaster, settings, pincodeMap, loading, error } = useCalculatorData();
  const [input, setInput] = useState<ProposalInput>(() =>
    initialInput ? normalizeProposalInput(initialInput) : defaultProposalInput(),
  );
  const [reference] = useState(initialReference ?? "");
  const [collapsedLocations, setCollapsedLocations] = useState<Set<string>>(new Set());

  const collapsible = input.locations.length >= 2;

  const toggleLocationCollapse = (locationId: string) => {
    setCollapsedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) next.delete(locationId);
      else next.add(locationId);
      return next;
    });
  };

  const result = useMemo(() => {
    if (!settings || !rateMaster.length) return null;
    return calcProposal(input, rateMaster, pincodeMap, settings);
  }, [input, rateMaster, pincodeMap, settings]);

  const premiumReady =
    !!result &&
    result.errors.length === 0 &&
    typeof result.net_premium === "number";

  const addLocation = () => {
    const newLocation = createEmptyLocation();
    const previousLocations = input.locations;

    setInput((prev) => {
      const locations = [...prev.locations, newLocation];
      return {
        ...prev,
        locations,
        sections: syncSectionsWithLocations(prev.sections, locations),
      };
    });

    if (previousLocations.length >= 1) {
      setCollapsedLocations((collapsed) => {
        const next = new Set(collapsed);
        for (const loc of previousLocations) next.add(loc.id);
        next.delete(newLocation.id);
        return next;
      });
    }
  };

  const updateLocation = (index: number, updated: ProposalInput["locations"][0]) => {
    setInput((prev) => {
      const locations = prev.locations.map((l, i) => (i === index ? updated : l));
      return {
        ...prev,
        locations,
        sections: syncSectionsWithLocations(prev.sections, locations),
      };
    });
  };

  const updateFloaterCover = (enabled: boolean) => {
    setInput((prev) => ({
      ...prev,
      floater_cover: {
        ...prev.floater_cover,
        enabled,
        ...(enabled
          ? {}
          : {
              floater_sum_insured: 0,
              max_sum_insured_per_location: 0,
            }),
      },
      locations: enabled
        ? prev.locations.map((loc) => ({ ...loc, stocks_si: 0 }))
        : prev.locations,
    }));
  };

  const removeLocation = (index: number) => {
    const removedId = input.locations[index]?.id;

    setInput((prev) => {
      const locations = prev.locations.filter((_, i) => i !== index);
      return {
        ...prev,
        locations,
        sections: syncSectionsWithLocations(prev.sections, locations),
      };
    });

    if (removedId) {
      setCollapsedLocations((collapsed) => {
        const next = new Set(collapsed);
        next.delete(removedId);
        return next;
      });
    }
  };

  const handlePdf = async () => {
    if (!result || !premiumReady) return;
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
            <label>GSTIN Number</label>
            <input
              value={input.gstin_number}
              onChange={(e) =>
                setInput((prev) => ({ ...prev, gstin_number: e.target.value }))
              }
              placeholder="e.g. 29AAAAA0000A1Z5"
            />
          </div>
          <div className="md:col-span-2">
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
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Hypothecation</h3>
          <div className="grid gap-3">
            <div>
              <label>Hypothecation 1</label>
              <input
                value={input.hypothecation_1}
                onChange={(e) =>
                  setInput((prev) => ({
                    ...prev,
                    hypothecation_1: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label>Hypothecation 2</label>
              <input
                value={input.hypothecation_2}
                onChange={(e) =>
                  setInput((prev) => ({
                    ...prev,
                    hypothecation_2: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label>Hypothecation 3</label>
              <input
                value={input.hypothecation_3}
                onChange={(e) =>
                  setInput((prev) => ({
                    ...prev,
                    hypothecation_3: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Terrorism</h2>
        <label className="choice-control">
          <input
            type="checkbox"
            checked={input.terrorism.opted}
            onChange={(e) =>
              setInput((prev) => ({
                ...prev,
                terrorism: {
                  opted: e.target.checked,
                  scope: e.target.checked ? prev.terrorism.scope || "Only fire cover" : "",
                },
              }))
            }
          />
          <span>Opt for terrorism</span>
        </label>
        {input.terrorism.opted && (
          <div className="max-w-xl">
            <label>Terrorism cover required for</label>
            <select
              value={input.terrorism.scope}
              onChange={(e) =>
                setInput((prev) => ({
                  ...prev,
                  terrorism: {
                    ...prev.terrorism,
                    scope: e.target.value as TerrorismScope,
                  },
                }))
              }
            >
              <option value="Only fire cover">Only fire cover</option>
              <option value="Both fire and money in transit">
                Both fire and money in transit
              </option>
            </select>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Floater Cover</h2>
        <label className="choice-control">
          <input
            type="checkbox"
            checked={input.floater_cover.enabled}
            onChange={(e) => updateFloaterCover(e.target.checked)}
          />
          <span>Floater cover required</span>
        </label>
        {input.floater_cover.enabled && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label>
                Stock floater sum insured required{" "}
                <span className="text-red-600">*</span>
              </label>
              <AmountInput
                value={input.floater_cover.floater_sum_insured}
                onChange={(value) =>
                  setInput((prev) => ({
                    ...prev,
                    floater_cover: {
                      ...prev.floater_cover,
                      floater_sum_insured: value,
                    },
                  }))
                }
              />
            </div>
            <div>
              <label>
                Maximum stock sum insured per location{" "}
                <span className="text-red-600">*</span>
              </label>
              <AmountInput
                value={input.floater_cover.max_sum_insured_per_location}
                onChange={(value) =>
                  setInput((prev) => ({
                    ...prev,
                    floater_cover: {
                      ...prev.floater_cover,
                      max_sum_insured_per_location: value,
                    },
                  }))
                }
              />
              {input.floater_cover.floater_sum_insured > 0 &&
                input.locations.length > 0 && (
                  <p
                    className={`text-xs mt-1 ${
                      input.floater_cover.max_sum_insured_per_location > 0 &&
                      input.floater_cover.max_sum_insured_per_location <
                        input.floater_cover.floater_sum_insured /
                          input.locations.length +
                          1
                        ? "text-red-600"
                        : "text-slate-500"
                    }`}
                  >
                    {(() => {
                      const minRequired =
                        input.floater_cover.floater_sum_insured /
                          input.locations.length +
                        1;
                      const formatted = minRequired.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      });
                      return `Enter the value greater than ${formatted}`;
                    })()}
                  </p>
                )}
            </div>
          </div>
        )}
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
            floaterCoverEnabled={input.floater_cover.enabled}
            collapsible={collapsible}
            collapsed={collapsible && collapsedLocations.has(loc.id)}
            onToggleCollapse={() => toggleLocationCollapse(loc.id)}
            onChange={(updated) => updateLocation(index, updated)}
            onRemove={() => removeLocation(index)}
            canRemove={input.locations.length > 1}
          />
        ))}
      </div>

      <GlobalSectionsForm
        sections={input.sections}
        locations={input.locations}
        onChange={(sections) => setInput((prev) => ({ ...prev, sections }))}
      />

      <div className="card space-y-4">
        <h2 className="section-title">Additional Remarks</h2>
        <div>
          <label>Remarks</label>
          <textarea
            rows={4}
            value={input.remarks}
            onChange={(e) =>
              setInput((prev) => ({ ...prev, remarks: e.target.value }))
            }
            placeholder="Enter any additional comments"
          />
        </div>
      </div>

      {result && <PremiumSummary result={result} premiumReady={premiumReady} />}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={!premiumReady}
          onClick={handlePdf}
        >
          Download Proposal
        </button>
      </div>
    </div>
  );
}
