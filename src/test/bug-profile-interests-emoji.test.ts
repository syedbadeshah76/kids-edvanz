import { describe, it, expect } from "vitest";
import { getInterestMeta, INTEREST_STYLES } from "@/pages/kidz/KidzProfile";

describe("Profile Interests Section Emoji & Character Rendering", () => {
  it("renders correct emojis/icons for all standard subjects without garbled characters (âœ¨)", () => {
    const subjects = [
      { name: "English", expectedIcon: "📖" },
      { name: "Coding", expectedIcon: "💻" },
      { name: "Music", expectedIcon: "🎶" },
      { name: "Science", expectedIcon: "🔬" },
      { name: "Math", expectedIcon: "÷" },
      { name: "Testing", expectedIcon: "🧪" },
    ];

    subjects.forEach(({ name, expectedIcon }) => {
      const meta = getInterestMeta(name);
      expect(meta.icon).toBe(expectedIcon);
      expect(meta.icon).not.toContain("âœ¨");
      expect(meta.icon).not.toContain("ðŸ");
    });
  });

  it("handles case-insensitive subject lookups", () => {
    expect(getInterestMeta("math").icon).toBe("÷");
    expect(getInterestMeta("MATH").icon).toBe("÷");
    expect(getInterestMeta("science").icon).toBe("🔬");
    expect(getInterestMeta("CODING").icon).toBe("💻");
    expect(getInterestMeta("Testing").icon).toBe("🧪");
  });

  it("falls back to clean unicode sparkle ✨ (not mojibake âœ¨) for unknown custom interests", () => {
    const customMeta = getInterestMeta("Robotics & AI Advanced");
    expect(customMeta.icon).toBe("✨");
    expect(customMeta.icon).not.toBe("âœ¨");
  });
});
