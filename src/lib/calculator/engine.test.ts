import { describe, expect, it } from "vitest";
import { calcProposal } from "./engine";
import type { GlobalSettings, ProposalInput, RateMasterRow } from "./types";
import { defaultGlobalSections, createEmptyLocation } from "./types";
import aditiFixture from "./__fixtures__/aditi-automobiles.json";
import rateMasterSeed from "../../../seed/rate_master.json";
import globalSettingsSeed from "../../../seed/global_settings.json";

const rateMaster = rateMasterSeed as RateMasterRow[];
const settings = globalSettingsSeed as GlobalSettings;

function buildAditiInput(): ProposalInput {
  const sections = defaultGlobalSections();
  sections.stock_floater =
    aditiFixture.stock_floater === "Cover Opted" ? "Cover Opted" : "Cover Not Opted";
  sections.burglary =
    aditiFixture.global_sections.burglary === "Cover Opted"
      ? "Cover Opted"
      : "Cover Not Opted";
  sections.mbd_eei =
    aditiFixture.global_sections.mbd_eei === "Cover Opted"
      ? "Cover Opted"
      : "Cover Not Opted";
  sections.plate_glass =
    aditiFixture.global_sections.plate_glass === "Cover Opted"
      ? "Cover Opted"
      : "Cover Not Opted";
  sections.neon_sign =
    aditiFixture.global_sections.neon_sign === "Cover Opted"
      ? "Cover Opted"
      : "Cover Not Opted";
  sections.public_liability =
    aditiFixture.global_sections.public_liability === "Cover Opted"
      ? "Cover Opted"
      : "Cover Not Opted";
  sections.fidelity =
    aditiFixture.global_sections.fidelity === "Cover Opted"
      ? "Cover Opted"
      : "Cover Not Opted";

  const locations = aditiFixture.locations.map((loc) => {
    const base = createEmptyLocation(`loc-${loc.location_number}`);
    return {
      ...base,
      address: loc.address,
      pincode: loc.pincode,
      occupancy: loc.occupancy as ProposalInput["locations"][0]["occupancy"],
      claims_history: "Nil claims in the past 3 years" as const,
      fire_cover:
        loc.fire_cover === "Cover Opted with Terrorism"
          ? ("Cover Opted with Terrorism" as const)
          : ("Cover Opted without Terrorism" as const),
      building_si: loc.building_si,
      plant_machinery_si: loc.plant_machinery_si,
      furniture_si: loc.furniture_si,
      plate_glass_si: loc.plate_glass_si,
      neon_sign_si: loc.neon_sign_si,
      stocks_si: loc.stocks_si,
      money:
        loc.location_number === 1
          ? {
              cover: "Cover Opted without Terrorism" as const,
              annual_carrying_limit: aditiFixture.money_global.annual_carrying_limit,
              single_carrying_limit: aditiFixture.money_global.single_carrying_limit,
              cash_in_safe: aditiFixture.money_global.cash_in_safe,
              cash_in_till: aditiFixture.money_global.cash_in_till,
            }
          : base.money,
    };
  });

  return {
    insured_name: aditiFixture.insured_name,
    communication_address: aditiFixture.communication_address,
    gstin_number: "",
    hypothecation_1: "",
    hypothecation_2: "",
    hypothecation_3: "",
    locations,
    sections,
  };
}

describe("calcProposal", () => {
  it("matches Aditi Automobiles Excel net premium", () => {
    const input = buildAditiInput();
    const pincodeMap = new Map(
      aditiFixture.locations.map((l) => [l.pincode, Number(l.eq_zone)]),
    );

    const result = calcProposal(input, rateMaster, pincodeMap, settings);

    expect(result.net_premium).toBeCloseTo(aditiFixture.expected.net_premium, 1);
    expect(result.gst).toBeCloseTo(aditiFixture.expected.gst, 1);
    expect(result.total_premium).toBeCloseTo(
      aditiFixture.expected.total_premium,
      1,
    );
    expect(result.sections.burglary_premium).toBeCloseTo(
      aditiFixture.expected.burglary_premium,
      1,
    );
    expect(result.sections.mbd_premium).toBeCloseTo(
      aditiFixture.expected.mbd_premium,
      1,
    );
  });

  it("calculates per-location fire premiums matching Excel", () => {
    const input = buildAditiInput();
    const pincodeMap = new Map(
      aditiFixture.locations.map((l) => [l.pincode, Number(l.eq_zone)]),
    );
    const result = calcProposal(input, rateMaster, pincodeMap, settings);

    aditiFixture.locations.forEach((loc, i) => {
      expect(result.locations[i].fire_premium).toBeCloseTo(loc.fire_premium, 1);
    });
  });

  it("returns referral message for claims history", () => {
    const input = buildAditiInput();
    input.locations[0].claims_history = "We have claimed in the past 3 years";
    const pincodeMap = new Map([["201301", 2]]);
    const result = calcProposal(input, rateMaster, pincodeMap, settings);
    expect(result.referral_required).toBe(true);
    expect(result.locations[0].fire_premium).toBe(
      "Kindly refer proposal to office",
    );
  });
});
