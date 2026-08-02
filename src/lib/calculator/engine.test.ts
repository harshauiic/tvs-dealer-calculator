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
  // Fixture Excel net assumed PL premium ≈ 0; use minimal valid SI so validation passes.
  if (sections.public_liability === "Cover Opted") {
    sections.public_liability_si = 1;
  }
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
      claims_history: "Nil Claims/Circumstances in the past 3 years" as const,
      no_expiring_policy: true,
      building_si: loc.building_si,
      plant_machinery_si: loc.plant_machinery_si,
      furniture_si: loc.furniture_si,
      plate_glass_si: loc.plate_glass_si,
      neon_sign_si: loc.neon_sign_si,
      stocks_si: loc.stocks_si,
      money:
        loc.location_number === 1
          ? {
              cover: "Opted" as const,
              annual_carrying_limit: aditiFixture.money_global.annual_carrying_limit,
              single_carrying_limit: aditiFixture.money_global.single_carrying_limit,
              cash_in_safe: aditiFixture.money_global.cash_in_safe,
              cash_in_till: aditiFixture.money_global.cash_in_till,
            }
          : {
              ...base.money,
              cover: "Not Opted" as const,
            },
    };
  });

  return {
    insured_name: aditiFixture.insured_name,
    communication_address: aditiFixture.communication_address,
    gstin_number: "",
    hypothecation_1: "",
    hypothecation_2: "",
    hypothecation_3: "",
    terrorism: { opted: false, scope: "" },
    floater_cover: {
      enabled: aditiFixture.stock_floater === "Cover Opted",
      floater_sum_insured: 0,
      max_sum_insured_per_location: 0,
    },
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

    // Net is the sum of per-line premiums rounded to the nearest rupee.
    const sectionalNet =
      result.locations.reduce(
        (s, l) =>
          s +
          (typeof l.fire_premium === "number" ? l.fire_premium : 0) +
          (typeof l.money_premium === "number" ? l.money_premium : 0),
        0,
      ) +
      (typeof result.sections.burglary_premium === "number"
        ? result.sections.burglary_premium
        : 0) +
      (typeof result.sections.mbd_premium === "number"
        ? result.sections.mbd_premium
        : 0) +
      (typeof result.sections.plate_glass_premium === "number"
        ? result.sections.plate_glass_premium
        : 0) +
      (typeof result.sections.neon_sign_premium === "number"
        ? result.sections.neon_sign_premium
        : 0) +
      (typeof result.sections.public_liability_premium === "number"
        ? result.sections.public_liability_premium
        : 0) +
      (typeof result.sections.fidelity_premium === "number"
        ? result.sections.fidelity_premium
        : 0) +
      (typeof result.terrorism_premium === "number"
        ? result.terrorism_premium
        : 0);
    expect(result.net_premium).toBe(sectionalNet);
    expect(
      Math.abs(
        (result.net_premium as number) -
          Math.round(aditiFixture.expected.net_premium),
      ),
    ).toBeLessThanOrEqual(5);
    expect(result.gst).toBe(
      Math.round((result.net_premium as number) * (settings.gst_rate_pct / 100)),
    );
    expect(result.total_premium).toBe(
      (result.net_premium as number) + (result.gst as number),
    );
    expect(result.sections.burglary_premium).toBe(
      Math.round(aditiFixture.expected.burglary_premium),
    );
    expect(result.sections.mbd_premium).toBe(
      Math.round(aditiFixture.expected.mbd_premium),
    );
  });

  it("calculates per-location fire premiums matching Excel", () => {
    const input = buildAditiInput();
    const pincodeMap = new Map(
      aditiFixture.locations.map((l) => [l.pincode, Number(l.eq_zone)]),
    );
    const result = calcProposal(input, rateMaster, pincodeMap, settings);

    aditiFixture.locations.forEach((loc, i) => {
      expect(result.locations[i].fire_premium).toBe(Math.round(loc.fire_premium));
    });
  });

  it("returns referral message for claims history", () => {
    const input = buildAditiInput();
    input.locations[0].claims_history =
      "We have claimed/There have been circumstances of claim in the past 3 years";
    const pincodeMap = new Map([["201301", 2]]);
    const result = calcProposal(input, rateMaster, pincodeMap, settings);
    expect(result.referral_required).toBe(true);
    expect(result.locations[0].fire_premium).toBe(
      "Section 1 - Fire - Location 1: Kindly refer proposal to office",
    );
    expect(result.errors).toContain(
      "Section 1 - Fire - Location 1: Kindly refer proposal to office",
    );
    expect(result.net_premium).toBe("Incomplete");
  });

  it("does not calculate premium when insured details are missing", () => {
    const input = buildAditiInput();
    input.insured_name = "";
    input.communication_address = "";
    const pincodeMap = new Map(
      aditiFixture.locations.map((l) => [l.pincode, Number(l.eq_zone)]),
    );
    const result = calcProposal(input, rateMaster, pincodeMap, settings);

    expect(result.locations[0].fire_premium).toBe(0);
    expect(result.net_premium).toBe("Incomplete");
    expect(result.errors).toContain("Insured Details: Please enter Insured name");
    expect(result.errors).toContain(
      "Insured Details: Please enter Communication Address",
    );
  });

  it("adds floater SI to burglary and validates max SI per location", () => {
    const input = buildAditiInput();
    input.floater_cover = {
      enabled: true,
      floater_sum_insured: 10_000_000,
      max_sum_insured_per_location: 1_000_000,
    };
    input.locations = input.locations.map((loc) => ({ ...loc, stocks_si: 0 }));
    const pincodeMap = new Map(
      aditiFixture.locations.map((l) => [l.pincode, Number(l.eq_zone)]),
    );

    const invalid = calcProposal(input, rateMaster, pincodeMap, settings);
    expect(invalid.errors.some((e) => e.includes("Enter the value greater than"))).toBe(
      true,
    );
    expect(invalid.net_premium).toBe("Incomplete");

    input.floater_cover.max_sum_insured_per_location =
      10_000_000 / input.locations.length + 1;
    const valid = calcProposal(input, rateMaster, pincodeMap, settings);
    const baseBurglary =
      input.locations.reduce(
        (sum, loc) =>
          sum +
          loc.plant_machinery_si +
          loc.furniture_si +
          loc.plate_glass_si +
          loc.neon_sign_si +
          loc.stocks_si,
        0,
      ) + 10_000_000;
    expect(valid.errors).toEqual([]);
    expect(valid.sections.burglary_si).toBe(baseBurglary);
    expect(typeof valid.fire_floater_premium).toBe("number");
    expect(valid.fire_floater_rate).not.toBeNull();
    expect(valid.fire_floater_premium as number).toBe(
      Math.round((10_000_000 * (valid.fire_floater_rate as number)) / 1000),
    );
  });

  it("bills terrorism separately from fire, floater, and money premiums", () => {
    const input = buildAditiInput();
    input.terrorism = {
      opted: true,
      scope: "Both fire and money in transit",
    };
    const pincodeMap = new Map(
      aditiFixture.locations.map((l) => [l.pincode, Number(l.eq_zone)]),
    );

    const withTerror = calcProposal(input, rateMaster, pincodeMap, settings);
    expect(typeof withTerror.terrorism_premium).toBe("number");
    expect(withTerror.terrorism_premium as number).toBeGreaterThan(0);

    input.terrorism = { opted: false, scope: "" };
    const withoutTerror = calcProposal(input, rateMaster, pincodeMap, settings);
    expect(withoutTerror.terrorism_premium).toBe("Cover Not Opted");

    // Sectional fire/money premiums exclude terrorism; net still includes it.
    const fireSumWith = withTerror.locations.reduce(
      (s, l) => s + (typeof l.fire_premium === "number" ? l.fire_premium : 0),
      0,
    );
    const fireSumWithout = withoutTerror.locations.reduce(
      (s, l) => s + (typeof l.fire_premium === "number" ? l.fire_premium : 0),
      0,
    );
    expect(fireSumWith).toBe(fireSumWithout);

    const moneySumWith = withTerror.locations.reduce(
      (s, l) => s + (typeof l.money_premium === "number" ? l.money_premium : 0),
      0,
    );
    const moneySumWithout = withoutTerror.locations.reduce(
      (s, l) => s + (typeof l.money_premium === "number" ? l.money_premium : 0),
      0,
    );
    expect(moneySumWith).toBe(moneySumWithout);

    expect(withTerror.net_premium as number).toBe(
      (withoutTerror.net_premium as number) +
        (withTerror.terrorism_premium as number),
    );
  });

  it("bands floater fire rates by Maximum stock SI per location (<=5Cr vs >5Cr)", () => {
    const input = buildAditiInput();
    const pincodeMap = new Map(
      aditiFixture.locations.map((l) => [l.pincode, Number(l.eq_zone)]),
    );
    input.locations = input.locations.map((loc) => ({ ...loc, stocks_si: 0 }));
    input.floater_cover = {
      enabled: true,
      floater_sum_insured: 100_000_000,
      max_sum_insured_per_location: settings.si_threshold,
    };

    const atThreshold = calcProposal(input, rateMaster, pincodeMap, settings);
    expect(atThreshold.errors).toEqual([]);
    expect(atThreshold.fire_floater_rate).not.toBeNull();

    input.floater_cover.max_sum_insured_per_location = settings.si_threshold + 1;
    const overThreshold = calcProposal(input, rateMaster, pincodeMap, settings);
    expect(overThreshold.errors).toEqual([]);
    expect(overThreshold.fire_floater_rate).not.toBeNull();
    expect(overThreshold.fire_floater_rate).not.toBe(atThreshold.fire_floater_rate);
  });
});
