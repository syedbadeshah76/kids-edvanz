import { describe, it, expect } from "vitest";
import { validatePhoneNumber, sanitizePhoneNumber } from "@/lib/utils";
import { createRegistrationDetailsSchema } from "@/pages/Register";

describe("Phone Number Validation Rules (Backend Contract)", () => {
  describe("Rule 1: Optional field — can be omitted, empty, or null", () => {
    it("treats null as valid and sanitizes to null", () => {
      expect(validatePhoneNumber(null).isValid).toBe(true);
      expect(sanitizePhoneNumber(null)).toBeNull();
    });

    it("treats undefined as valid and sanitizes to null", () => {
      expect(validatePhoneNumber(undefined).isValid).toBe(true);
      expect(sanitizePhoneNumber(undefined)).toBeNull();
    });

    it("treats empty string as valid and sanitizes to null", () => {
      expect(validatePhoneNumber("").isValid).toBe(true);
      expect(sanitizePhoneNumber("")).toBeNull();
    });

    it("treats whitespace-only string as valid and sanitizes to null", () => {
      expect(validatePhoneNumber("   ").isValid).toBe(true);
      expect(sanitizePhoneNumber("   ")).toBeNull();
    });
  });

  describe("Rule 2 & 3 & 4: Valid Examples from specification", () => {
    it("accepts +919876543210 (starts with +, 12 digits)", () => {
      const res = validatePhoneNumber("+919876543210");
      expect(res.isValid).toBe(true);
      expect(sanitizePhoneNumber("+919876543210")).toBe("+919876543210");
    });

    it("accepts 919876543210 (without +, 12 digits)", () => {
      const res = validatePhoneNumber("919876543210");
      expect(res.isValid).toBe(true);
      expect(sanitizePhoneNumber("919876543210")).toBe("919876543210");
    });

    it("accepts 9876543210 (without +, 10 digits)", () => {
      const res = validatePhoneNumber("9876543210");
      expect(res.isValid).toBe(true);
      expect(sanitizePhoneNumber("9876543210")).toBe("9876543210");
    });

    it("accepts +123456789012345 (starts with +, 15 digits max)", () => {
      const res = validatePhoneNumber("+123456789012345");
      expect(res.isValid).toBe(true);
      expect(sanitizePhoneNumber("+123456789012345")).toBe("+123456789012345");
    });
  });

  describe("Rule 5: Invalid Examples from specification", () => {
    it("rejects numbers with spaces: '+91 9876543210'", () => {
      const res = validatePhoneNumber("+91 9876543210");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("spaces");
    });

    it("rejects numbers with hyphens: '+91-9876543210'", () => {
      const res = validatePhoneNumber("+91-9876543210");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("hyphens");
    });

    it("rejects numbers with brackets: '+91(9876543210)'", () => {
      const res = validatePhoneNumber("+91(9876543210)");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("brackets");
    });

    it("rejects numbers with fewer than 7 digits: '98765'", () => {
      const res = validatePhoneNumber("98765");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("7 digits");
    });

    it("rejects numbers with more than 15 digits: '1234567890123456'", () => {
      const res = validatePhoneNumber("1234567890123456");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("15 digits");
    });

    it("rejects numbers with letters: '+91ABC987654'", () => {
      const res = validatePhoneNumber("+91ABC987654");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("digits");
    });
  });

  describe("Registration Details Schema Integration", () => {
    it("allows registration when phone is omitted", () => {
      const schema = createRegistrationDetailsSchema("pro", "IN");
      const res = schema.safeParse({
        firstName: "Alice",
        lastName: "Smith",
        email: "alice@example.com",
        country: "India",
        city: "Bangalore",
        phone: "",
      });
      expect(res.success).toBe(true);
    });

    it("allows registration with valid 10-digit phone for India", () => {
      const schema = createRegistrationDetailsSchema("pro", "IN");
      const res = schema.safeParse({
        firstName: "Alice",
        lastName: "Smith",
        email: "alice@example.com",
        country: "India",
        city: "Bangalore",
        phone: "9876543210",
      });
      expect(res.success).toBe(true);
    });

    it("allows registration with valid international phone (+919876543210)", () => {
      const schema = createRegistrationDetailsSchema("pro", "IN");
      const res = schema.safeParse({
        firstName: "Alice",
        lastName: "Smith",
        email: "alice@example.com",
        country: "India",
        city: "Bangalore",
        phone: "+919876543210",
      });
      expect(res.success).toBe(true);
    });

    it("rejects phone with spaces in registration schema", () => {
      const schema = createRegistrationDetailsSchema("pro", "IN");
      const res = schema.safeParse({
        firstName: "Alice",
        lastName: "Smith",
        email: "alice@example.com",
        country: "India",
        city: "Bangalore",
        phone: "+91 9876543210",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("spaces");
      }
    });
  });
});
