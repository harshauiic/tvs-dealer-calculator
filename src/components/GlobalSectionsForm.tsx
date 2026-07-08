import type { GlobalSections, LocationInput } from "../lib/calculator";

interface Props {
  sections: GlobalSections;
  locations: LocationInput[];
  onChange: (sections: GlobalSections) => void;
}

const TOGGLE_SECTIONS = [
  ["burglary", "Section 2 - Burglary (All locations)", null],
  ["mbd_eei", "Section 3 - MBD/EEI (All locations)", "plant"],
  ["plate_glass", "Section 4 - Plate glass (All locations)", "plate"],
  ["neon_sign", "Section 5 - Neon sign (All locations)", "neon"],
  ["public_liability", "Section 6 - Public Liability (All locations)", null],
  ["fidelity", "Section 7 - Fidelity (All locations)", null],
] as const;

type SectionKey = (typeof TOGGLE_SECTIONS)[number][0];
type SiGate = (typeof TOGGLE_SECTIONS)[number][2];

function isSectionEnabled(locations: LocationInput[], gate: SiGate): boolean {
  if (gate === "plant") {
    return locations.some((l) => l.plant_machinery_si > 0);
  }
  if (gate === "plate") {
    return locations.some((l) => l.plate_glass_si > 0);
  }
  if (gate === "neon") {
    return locations.some((l) => l.neon_sign_si > 0);
  }
  return true;
}

export default function GlobalSectionsForm({ sections, locations, onChange }: Props) {
  const update = <K extends keyof GlobalSections>(key: K, value: GlobalSections[K]) => {
    onChange({ ...sections, [key]: value });
  };

  return (
    <div className="card space-y-4">
      <h2 className="section-title">Other Sections</h2>
      <div className="space-y-4 max-w-xl">
        {TOGGLE_SECTIONS.map(([key, label, gate]) => {
          const enabled = isSectionEnabled(locations, gate);
          const sectionKey = key as SectionKey;
          return (
            <div key={key} className="space-y-3">
              <div>
                <label>{label}</label>
                <select
                  value={enabled ? sections[sectionKey] : "Cover Not Opted"}
                  disabled={!enabled}
                  onChange={(e) =>
                    update(sectionKey, e.target.value as GlobalSections[typeof sectionKey])
                  }
                >
                  <option value="Cover Opted">Cover Opted</option>
                  <option value="Cover Not Opted">Cover Not Opted</option>
                </select>
                {!enabled && (
                  <p className="text-xs text-slate-500 mt-1">
                    Enter a Sum Insured value in at least one location to enable this section.
                  </p>
                )}
              </div>

              {sectionKey === "public_liability" &&
                enabled &&
                sections.public_liability === "Cover Opted" && (
                  <div>
                    <label>Public Liability Sum Insured</label>
                    <input
                      type="number"
                      min={0}
                      value={sections.public_liability_si}
                      onChange={(e) =>
                        update("public_liability_si", Number(e.target.value))
                      }
                    />
                  </div>
                )}

              {sectionKey === "fidelity" &&
                enabled &&
                sections.fidelity === "Cover Opted" && (
                  <div className="space-y-3">
                    <div>
                      <label>No of permanent employees</label>
                      <input
                        type="number"
                        min={0}
                        value={sections.fidelity_employees}
                        onChange={(e) =>
                          update("fidelity_employees", Number(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label>Floater SI</label>
                      <input
                        type="number"
                        min={0}
                        value={sections.fidelity_floater_si}
                        onChange={(e) =>
                          update("fidelity_floater_si", Number(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label>Per employee limit</label>
                      <input
                        type="number"
                        min={0}
                        value={sections.fidelity_per_employee_limit}
                        onChange={(e) =>
                          update("fidelity_per_employee_limit", Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
