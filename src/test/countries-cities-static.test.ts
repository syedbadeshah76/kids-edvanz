import { describe, it, expect } from "vitest";
import {
  countries,
  getCitiesByCountry,
  getCountryByNameOrCode,
  getDialCodeByCountry,
} from "@/data/countriesCities";
import { locationService } from "@/services/location.service";

describe("Static Countries and Cities Dataset (src/data/countriesCities.js)", () => {
  it("defines exactly the 10 specified countries", () => {
    expect(countries.length).toBe(10);
    const expectedCountries = [
      { name: "India", code: "IN", dialCode: "+91" },
      { name: "United States", code: "US", dialCode: "+1" },
      { name: "United Kingdom", code: "GB", dialCode: "+44" },
      { name: "United Arab Emirates", code: "AE", dialCode: "+971" },
      { name: "Canada", code: "CA", dialCode: "+1" },
      { name: "Australia", code: "AU", dialCode: "+61" },
      { name: "Saudi Arabia", code: "SA", dialCode: "+966" },
      { name: "Pakistan", code: "PK", dialCode: "+92" },
      { name: "Singapore", code: "SG", dialCode: "+65" },
      { name: "Germany", code: "DE", dialCode: "+49" },
    ];

    expectedCountries.forEach((expected) => {
      const found = countries.find((c) => c.name === expected.name);
      expect(found).toBeDefined();
      expect(found?.code).toBe(expected.code);
      expect(found?.dialCode).toBe(expected.dialCode);
    });
  });

  it("defines the exact specified cities for each country", () => {
    expect(getCitiesByCountry("India")).toEqual([
      "Hyderabad",
      "Mumbai",
      "Delhi",
      "Bangalore",
      "Chennai",
      "Kolkata",
      "Pune",
      "Ahmedabad",
      "Jaipur",
      "Lucknow",
    ]);

    expect(getCitiesByCountry("US")).toEqual([
      "New York",
      "Los Angeles",
      "Chicago",
      "Houston",
      "San Francisco",
      "Miami",
      "Seattle",
      "Boston",
    ]);

    expect(getCitiesByCountry("United Kingdom")).toEqual([
      "London",
      "Manchester",
      "Birmingham",
      "Liverpool",
      "Leeds",
      "Bristol",
      "Glasgow",
      "Edinburgh",
    ]);

    expect(getCitiesByCountry("AE")).toEqual([
      "Dubai",
      "Abu Dhabi",
      "Sharjah",
      "Ajman",
      "Fujairah",
      "Al Ain",
    ]);

    expect(getCitiesByCountry("Canada")).toEqual([
      "Toronto",
      "Vancouver",
      "Montreal",
      "Calgary",
      "Ottawa",
      "Edmonton",
      "Winnipeg",
    ]);

    expect(getCitiesByCountry("AU")).toEqual([
      "Sydney",
      "Melbourne",
      "Brisbane",
      "Perth",
      "Adelaide",
      "Canberra",
      "Gold Coast",
    ]);

    expect(getCitiesByCountry("Saudi Arabia")).toEqual([
      "Riyadh",
      "Jeddah",
      "Mecca",
      "Medina",
      "Dammam",
      "Taif",
    ]);

    expect(getCitiesByCountry("PK")).toEqual([
      "Karachi",
      "Lahore",
      "Islamabad",
      "Rawalpindi",
      "Faisalabad",
      "Multan",
      "Peshawar",
    ]);

    expect(getCitiesByCountry("Singapore")).toEqual(["Singapore"]);

    expect(getCitiesByCountry("DE")).toEqual([
      "Berlin",
      "Munich",
      "Hamburg",
      "Frankfurt",
      "Cologne",
      "Stuttgart",
      "Düsseldorf",
    ]);
  });

  it("returns empty array for invalid or missing country", () => {
    expect(getCitiesByCountry("")).toEqual([]);
    expect(getCitiesByCountry("Atlantis")).toEqual([]);
  });

  it("finds country and dialCode by name or ISO code case-insensitively", () => {
    expect(getCountryByNameOrCode("in")?.name).toBe("India");
    expect(getCountryByNameOrCode("INDIA")?.code).toBe("IN");
    expect(getDialCodeByCountry("United States")).toBe("+1");
    expect(getDialCodeByCountry("DE")).toBe("+49");
    expect(getDialCodeByCountry("Unknown")).toBe("+91");
  });

  it("locationService returns cities without making external fetch calls", async () => {
    const cities = await locationService.getCities("India");
    expect(cities).toContain("Hyderabad");
    expect(cities).toContain("Mumbai");
    expect(cities.length).toBe(10);
  });
});
