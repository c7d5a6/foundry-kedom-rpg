import { describe, expect, it } from "vitest";
import {
  freeParameterSpecializationSlug,
  freeSpecializationSlug,
} from "./specializations.ts";

describe("freeSpecializationSlug", () => {
  it("keeps ASCII labels", () => {
    expect(freeSpecializationSlug("arcana", "Fire Magic")).toBe("arcana.fire.magic");
  });

  it("keeps Cyrillic labels so distinct names do not collide on custom", () => {
    expect(freeSpecializationSlug("arcana", "Кверан")).toBe("arcana.кверан");
    expect(freeSpecializationSlug("arcana", "Иное")).toBe("arcana.иное");
    expect(freeSpecializationSlug("arcana", "Кверан")).not.toBe(
      freeSpecializationSlug("arcana", "Иное"),
    );
  });

  it("scopes free labels per skill", () => {
    expect(freeSpecializationSlug("craft", "Кверан")).toBe("craft.кверан");
    expect(freeSpecializationSlug("arcana", "Кверан")).not.toBe(
      freeSpecializationSlug("craft", "Кверан"),
    );
  });

  it("uses a stable non-empty fallback for labels with no letters", () => {
    const a = freeSpecializationSlug("arcana", "🔥");
    const b = freeSpecializationSlug("arcana", "❄️");
    expect(a.startsWith("arcana.custom.")).toBe(true);
    expect(b.startsWith("arcana.custom.")).toBe(true);
    expect(a).not.toBe(b);
    expect(freeSpecializationSlug("arcana", "🔥")).toBe(a);
  });
});

describe("freeParameterSpecializationSlug", () => {
  it("keeps Cyrillic under the parameter segment", () => {
    expect(freeParameterSpecializationSlug("survive", "environment", "Тайга")).toBe(
      "survive.environment.тайга",
    );
  });
});
