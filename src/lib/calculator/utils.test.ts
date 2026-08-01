import { describe, expect, it } from "vitest";
import { resolveFireCover, resolveMoneyCover } from "./utils";

describe("resolveFireCover / resolveMoneyCover", () => {
  it("does not apply terrorism when not opted", () => {
    expect(resolveFireCover({ opted: false, scope: "" })).toBe(
      "Cover Opted without Terrorism",
    );
    expect(resolveMoneyCover("Opted", { opted: false, scope: "" })).toBe(
      "Cover Opted without Terrorism",
    );
  });

  it("applies terrorism only to fire when scope is Only fire cover", () => {
    const terrorism = {
      opted: true,
      scope: "Only fire cover" as const,
    };
    expect(resolveFireCover(terrorism)).toBe("Cover Opted with Terrorism");
    expect(resolveMoneyCover("Opted", terrorism)).toBe(
      "Cover Opted without Terrorism",
    );
  });

  it("applies terrorism to both fire and money when scope is Both", () => {
    const terrorism = {
      opted: true,
      scope: "Both fire and money in transit" as const,
    };
    expect(resolveFireCover(terrorism)).toBe("Cover Opted with Terrorism");
    expect(resolveMoneyCover("Opted", terrorism)).toBe(
      "Cover Opted with Terrorism",
    );
  });

  it("keeps money Not Opted when money cover is off", () => {
    expect(
      resolveMoneyCover("Not Opted", {
        opted: true,
        scope: "Both fire and money in transit",
      }),
    ).toBe("Cover Not Opted");
  });
});
