import type { GlobalSections } from "../lib/calculator";

interface Props {
  sections: GlobalSections;
  onChange: (sections: GlobalSections) => void;
}

const TOGGLE_SECTIONS = [
  ["stock_floater", "Stock Floater required for locations"],
  ["burglary", "Section 2 - Burglary (All locations)"],
  ["mbd_eei", "Section 3 - MBD/EEI (All locations)"],
  ["plate_glass", "Section 4 - Plate glass (All locations)"],
  ["neon_sign", "Section 5 - Neon sign (All locations)"],
  ["public_liability", "Section 6 - Public Liability (All locations)"],
  ["fidelity", "Section 7 - Fidelity (All locations)"],
] as const;

export default function GlobalSectionsForm({ sections, onChange }: Props) {
  const update = <K extends keyof GlobalSections>(key: K, value: GlobalSections[K]) => {
    onChange({ ...sections, [key]: value });
  };

  return (
    <div className="card space-y-4">
      <h2 className="section-title">Global Sections</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {TOGGLE_SECTIONS.map(([key, label]) => (
          <div key={key}>
            <label>{label}</label>
            <select
              value={sections[key]}
              onChange={(e) =>
                update(key, e.target.value as GlobalSections[typeof key])
              }
            >
              <option value="Cover Opted">Cover Opted</option>
              <option value="Cover Not Opted">Cover Not Opted</option>
            </select>
          </div>
        ))}
      </div>

      {sections.public_liability === "Cover Opted" && (
        <div>
          <label>Public Liability Sum Insured</label>
          <input
            type="number"
            min={0}
            value={sections.public_liability_si}
            onChange={(e) => update("public_liability_si", Number(e.target.value))}
          />
        </div>
      )}

      {sections.fidelity === "Cover Opted" && (
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label>No of permanent employees</label>
            <input
              type="number"
              min={0}
              value={sections.fidelity_employees}
              onChange={(e) => update("fidelity_employees", Number(e.target.value))}
            />
          </div>
          <div>
            <label>Floater SI</label>
            <input
              type="number"
              min={0}
              value={sections.fidelity_floater_si}
              onChange={(e) => update("fidelity_floater_si", Number(e.target.value))}
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
}
