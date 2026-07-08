import type { LocationInput } from "../lib/calculator";
import { OCCUPANCY_TYPES } from "../lib/calculator";

interface Props {
  location: LocationInput;
  index: number;
  eqZone: number | null;
  floaterCoverEnabled: boolean;
  onChange: (updated: LocationInput) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const SI_FIELDS = [
  ["building_si", "Building SI"],
  ["plant_machinery_si", "Plant and machinery SI"],
  ["furniture_si", "Furniture Fixtures SI"],
  ["plate_glass_si", "Plate glass SI"],
  ["neon_sign_si", "Neon sign SI"],
  ["stocks_si", "Stocks SI"],
] as const;

export default function LocationForm({
  location,
  index,
  eqZone,
  floaterCoverEnabled,
  onChange,
  onRemove,
  canRemove,
}: Props) {
  const update = <K extends keyof LocationInput>(key: K, value: LocationInput[K]) => {
    onChange({ ...location, [key]: value });
  };

  const updateMoney = <K extends keyof LocationInput["money"]>(
    key: K,
    value: LocationInput["money"][K],
  ) => {
    onChange({ ...location, money: { ...location.money, [key]: value } });
  };

  const num = (key: keyof LocationInput) => Number(location[key] || 0);

  const totalSI =
    num("building_si") +
    num("plant_machinery_si") +
    num("furniture_si") +
    num("plate_glass_si") +
    num("neon_sign_si") +
    num("stocks_si");

  const moneyOpted = location.money.cover === "Opted";

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="section-title mb-0 border-0 pb-0">Location {index + 1}</h3>
        {canRemove && (
          <button type="button" className="btn-danger" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="subsection-title">Location Details</h4>
        <div className="space-y-4 max-w-xl">
          <div>
            <label>Dealer code</label>
            <input
              value={location.dealer_code}
              onChange={(e) => update("dealer_code", e.target.value)}
            />
          </div>
          <div>
            <label>Risk location Pincode</label>
            <input
              value={location.pincode}
              maxLength={6}
              onChange={(e) => update("pincode", e.target.value.replace(/\D/g, ""))}
            />
            {location.pincode.length === 6 && (
              <p className="text-xs mt-1 text-slate-500">
                Earthquake Zone: {eqZone ?? "Invalid pincode"}
              </p>
            )}
          </div>
          <div>
            <label>Risk location Address</label>
            <textarea
              rows={2}
              value={location.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </div>
          <div>
            <label>Risk description</label>
            <select
              value={location.occupancy}
              onChange={(e) =>
                update("occupancy", e.target.value as LocationInput["occupancy"])
              }
            >
              <option value="">Select</option>
              {OCCUPANCY_TYPES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="subsection-title">Expiring policy details</h4>
        <div className="space-y-4 max-w-xl">
          <div>
            <label>Name of Insurance company</label>
            <input
              value={location.insurance_company}
              onChange={(e) => update("insurance_company", e.target.value)}
            />
          </div>
          <div>
            <label>Period of cover</label>
            <input
              value={location.period_of_cover}
              onChange={(e) => update("period_of_cover", e.target.value)}
            />
          </div>
          <div>
            <label>Claims in the past 3 years</label>
            <select
              value={location.claims_history}
              onChange={(e) =>
                update("claims_history", e.target.value as LocationInput["claims_history"])
              }
            >
              <option value="Select">Select</option>
              <option value="Nil claims in the past 3 years">
                Nil claims in the past 3 years
              </option>
              <option value="We have claimed in the past 3 years">
                We have claimed in the past 3 years
              </option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-slate-800 mb-2">Section 1 - Fire Sum Insured</h4>
        <div className="grid md:grid-cols-3 gap-3">
          {SI_FIELDS.map(([key, label]) => {
            const isStocks = key === "stocks_si";
            return (
              <div key={key}>
                <label>{label}</label>
                <input
                  type="number"
                  min={0}
                  value={location[key]}
                  disabled={isStocks && floaterCoverEnabled}
                  onChange={(e) => update(key, Number(e.target.value))}
                />
              </div>
            );
          })}
        </div>
        <p className="text-sm text-slate-600 mt-2">Total SI: ₹{totalSI.toLocaleString("en-IN")}</p>
        {floaterCoverEnabled && (
          <p className="text-xs text-slate-500 mt-1">
            Stocks SI is disabled while Floater cover is selected.
          </p>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <h4 className="font-medium text-slate-800 mb-0">
            Section 8 - Money in transit (Location {index + 1})
          </h4>
          <div className="choice-group">
            <span className="text-sm font-medium text-slate-700">Money cover</span>
            <label className="choice-control">
              <input
                type="radio"
                name={`money-cover-${location.id}`}
                checked={!moneyOpted}
                onChange={() => updateMoney("cover", "Not Opted")}
              />
              Not Opted
            </label>
            <label className="choice-control">
              <input
                type="radio"
                name={`money-cover-${location.id}`}
                checked={moneyOpted}
                onChange={() => updateMoney("cover", "Opted")}
              />
              Opted
            </label>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label>Annual Carrying limit</label>
            <input
              type="number"
              min={0}
              value={location.money.annual_carrying_limit}
              onChange={(e) =>
                updateMoney("annual_carrying_limit", Number(e.target.value))
              }
            />
          </div>
          <div>
            <label>Single carrying limit</label>
            <input
              type="number"
              min={0}
              value={location.money.single_carrying_limit}
              onChange={(e) =>
                updateMoney("single_carrying_limit", Number(e.target.value))
              }
            />
          </div>
          <div>
            <label>Cash in safe</label>
            <input
              type="number"
              min={0}
              value={location.money.cash_in_safe}
              onChange={(e) => updateMoney("cash_in_safe", Number(e.target.value))}
            />
          </div>
          <div>
            <label>Cash in till</label>
            <input
              type="number"
              min={0}
              value={location.money.cash_in_till}
              onChange={(e) => updateMoney("cash_in_till", Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
