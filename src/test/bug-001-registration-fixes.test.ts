import { describe, it, expect } from "vitest";
import { countries, getCitiesByCountry } from "@/data/countriesCities";
import { createRegistrationDetailsSchema, getMaxPhoneDigits } from "@/pages/Register";

describe("Static Country and City Dataset", () => {
  it("Cities for India (IN) contain popular cities and are searchable", () => {
    const uniqueCities = getCitiesByCountry("IN");
    expect(uniqueCities.length).toBe(10);
    expect(uniqueCities).toContain("Hyderabad");
    expect(uniqueCities).toContain("Mumbai");
    expect(uniqueCities).toContain("Delhi");
    expect(uniqueCities).toContain("Bangalore");

    // Search results
    const searchQuery = "hyderabad";
    const searchResults = uniqueCities.filter((city) =>
      city.toLowerCase().includes(searchQuery)
    );
    expect(searchResults).toEqual(["Hyderabad"]);
  });

  it("Countries list has all 10 countries with ISO codes, dialCodes, and cities", () => {
    expect(countries.length).toBe(10);
    const names = countries.map((c) => c.name);
    expect(names).toEqual([
      "India",
      "United States",
      "United Kingdom",
      "United Arab Emirates",
      "Canada",
      "Australia",
      "Saudi Arabia",
      "Pakistan",
      "Singapore",
      "Germany",
    ]);

    // All countries have code, dialCode and non-empty cities
    for (const c of countries) {
      expect(c.code.length).toBe(2);
      expect(c.dialCode.startsWith("+")).toBe(true);
      expect(c.cities.length).toBeGreaterThan(0);
    }
  });
});

describe("Mandatory Fields, Age Limit (Max 15), & Country Phone Max Digits", () => {
  it("enforces max 10 digits for India and max digits per country", () => {
    expect(getMaxPhoneDigits("IN")).toBe(10);
    expect(getMaxPhoneDigits("US")).toBe(10);
    expect(getMaxPhoneDigits("AE")).toBe(9);

    const schemaIN = createRegistrationDetailsSchema("pro", "IN");

    // Invalid: 11 digits for India
    const res11 = schemaIN.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      country: "India",
      city: "Mumbai",
      phone: "09876543212",
    });
    expect(res11.success).toBe(false);
    if (!res11.success) {
      expect(res11.error.issues[0].message).toContain("10 digits for India");
    }

    // Invalid: 8 digits for India
    const res8 = schemaIN.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      country: "India",
      city: "Mumbai",
      phone: "98765432",
    });
    expect(res8.success).toBe(false);

    // Valid: Exactly 10 digits for India
    const validIN = schemaIN.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      country: "India",
      city: "Mumbai",
      phone: "9876543210",
    });
    expect(validIN.success).toBe(true);
  });

  it("requires Age <= 15 for Edvanz Next (fails for age > 15 like 19)", () => {
    const schema = createRegistrationDetailsSchema("next", "IN");

    // Missing age
    const resWithoutAge = schema.safeParse({
      firstName: "Kid",
      lastName: "Student",
      email: "kid@example.com",
      country: "India",
      city: "Delhi",
      phone: "9876543210",
    });
    expect(resWithoutAge.success).toBe(false);
    if (!resWithoutAge.success) {
      expect(resWithoutAge.error.issues.some((i) => i.path.includes("age"))).toBe(true);
    }

    // Invalid age > 15 (e.g. 19 as reported by user)
    const resAge19 = schema.safeParse({
      firstName: "Kid",
      lastName: "Student",
      email: "kid@example.com",
      country: "India",
      city: "Delhi",
      phone: "9876543210",
      age: "19",
    });
    expect(resAge19.success).toBe(false);
    if (!resAge19.success) {
      expect(resAge19.error.issues.some((i) => i.message.includes("15 or less"))).toBe(true);
    }

    // Valid age (e.g. 10, 15)
    const valid10 = schema.safeParse({
      firstName: "Kid",
      lastName: "Student",
      email: "kid@example.com",
      country: "India",
      city: "Delhi",
      phone: "9876543210",
      age: "10",
    });
    expect(valid10.success).toBe(true);

    const valid15 = schema.safeParse({
      firstName: "Kid",
      lastName: "Student",
      email: "kid@example.com",
      country: "India",
      city: "Delhi",
      phone: "9876543210",
      age: "15",
    });
    expect(valid15.success).toBe(true);
  });

  it("accepts custom/manual country and city not in the popular static dataset", () => {
    const schema = createRegistrationDetailsSchema("next", "OTHER");

    // Custom country (e.g., China) and custom city (e.g., Beijing)
    const customResult = schema.safeParse({
      firstName: "Li",
      lastName: "Wei",
      email: "li.wei@example.com",
      country: "China",
      city: "Beijing",
      phone: "13800138000",
      age: "12",
    });

    expect(customResult.success).toBe(true);
  });
});
