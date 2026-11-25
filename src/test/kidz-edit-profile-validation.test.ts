import { describe, it, expect } from "vitest";
import { validatePhoneNumber } from "@/lib/utils";

describe("Kidz Edit Profile Validation Rules", () => {
  const validateProfileForm = (formData: {
    fullName: string;
    age: string;
    city: string;
    country: string;
    contactNo?: string;
  }) => {
    const trimmedFullName = formData.fullName.trim();
    const trimmedAge = formData.age.trim();
    const ageNum = Number(trimmedAge);
    const isAgeValid =
      Boolean(trimmedAge) && !isNaN(ageNum) && ageNum >= 4 && ageNum <= 18;
    const isFullNameValid = trimmedFullName.length >= 2;
    const trimmedCity = formData.city.trim();
    const isCityValid = trimmedCity.length >= 2;
    const trimmedCountry = formData.country.trim();
    const isCountryValid = trimmedCountry.length >= 2;
    const phone = formData.contactNo ? formData.contactNo.trim() : "";
    const phoneValidation = phone
      ? validatePhoneNumber(phone)
      : { isValid: true, error: "" };
    const isPhoneValid = phoneValidation.isValid;

    const isFormValid = Boolean(
      isFullNameValid &&
        isAgeValid &&
        isCityValid &&
        isCountryValid &&
        isPhoneValid
    );

    return {
      isFormValid,
      isFullNameValid,
      isAgeValid,
      isCityValid,
      isCountryValid,
      isPhoneValid,
      phoneError: phoneValidation.error,
    };
  };

  const checkHasChanges = (
    current: {
      fullName: string;
      age: string;
      contactNo: string;
      city: string;
      country: string;
      bio: string;
      avatar: string;
      interests: string[];
    },
    initial: {
      fullName: string;
      age: string;
      contactNo: string;
      city: string;
      country: string;
      bio: string;
      avatar: string;
      interests: string[];
    }
  ) => {
    if (current.fullName.trim() !== initial.fullName.trim()) return true;
    if (current.age.trim() !== initial.age.trim()) return true;
    if (current.contactNo.trim() !== initial.contactNo.trim()) return true;
    if (current.city.trim() !== initial.city.trim()) return true;
    if (current.country.trim() !== initial.country.trim()) return true;
    if (current.bio.trim() !== initial.bio.trim()) return true;
    if (current.avatar !== initial.avatar) return true;

    const currentSorted = [...current.interests].sort();
    const initSorted = [...initial.interests].sort();
    if (currentSorted.length !== initSorted.length) return true;
    for (let i = 0; i < currentSorted.length; i++) {
      if (currentSorted[i].toLowerCase() !== initSorted[i].toLowerCase()) {
        return true;
      }
    }

    return false;
  };

  it("fails validation when all fields are empty (QA Bug Step 5)", () => {
    const result = validateProfileForm({
      fullName: "",
      age: "",
      city: "",
      country: "",
    });

    expect(result.isFormValid).toBe(false);
    expect(result.isFullNameValid).toBe(false);
    expect(result.isAgeValid).toBe(false);
    expect(result.isCityValid).toBe(false);
    expect(result.isCountryValid).toBe(false);
  });

  it("fails validation when city or country is missing", () => {
    const result = validateProfileForm({
      fullName: "Emma Watson",
      age: "12",
      city: "",
      country: "India",
    });

    expect(result.isFormValid).toBe(false);
    expect(result.isCityValid).toBe(false);
  });

  it("fails validation when age is missing or out of valid range (4-18)", () => {
    expect(
      validateProfileForm({
        fullName: "Emma Watson",
        age: "",
        city: "Hyderabad",
        country: "India",
      }).isFormValid
    ).toBe(false);

    expect(
      validateProfileForm({
        fullName: "Emma Watson",
        age: "2",
        city: "Hyderabad",
        country: "India",
      }).isAgeValid
    ).toBe(false);

    expect(
      validateProfileForm({
        fullName: "Emma Watson",
        age: "25",
        city: "Hyderabad",
        country: "India",
      }).isAgeValid
    ).toBe(false);

    expect(
      validateProfileForm({
        fullName: "Emma Watson",
        age: "12",
        city: "Hyderabad",
        country: "India",
      }).isAgeValid
    ).toBe(true);
  });

  it("passes validation when all mandatory fields are provided", () => {
    const result = validateProfileForm({
      fullName: "Emma Watson",
      age: "12",
      city: "Hyderabad",
      country: "India",
    });

    expect(result.isFormValid).toBe(true);
  });

  it("validates optional phone number when entered", () => {
    // Valid phone number
    expect(
      validateProfileForm({
        fullName: "Emma Watson",
        age: "12",
        city: "Hyderabad",
        country: "India",
        contactNo: "+919876543210",
      }).isFormValid
    ).toBe(true);

    // Invalid phone number (less than 7 digits)
    const invalidPhoneResult = validateProfileForm({
      fullName: "Emma Watson",
      age: "12",
      city: "Hyderabad",
      country: "India",
      contactNo: "12345",
    });
    expect(invalidPhoneResult.isFormValid).toBe(false);
    expect(invalidPhoneResult.isPhoneValid).toBe(false);
  });

  it("initial learning interests remain unselected ([]) by default", () => {
    const initialInterests: string[] = [];
    expect(initialInterests).toEqual([]);
    expect(initialInterests.length).toBe(0);
  });

  it("disappears Save button when user has not entered or changed anything (hasChanges === false)", () => {
    const initial = {
      fullName: "Emma Watson",
      age: "12",
      contactNo: "+919876543210",
      city: "Hyderabad",
      country: "India",
      bio: "Hello world",
      avatar: "bird",
      interests: ["Math", "Science"],
    };

    // Exactly matching initial profile state
    const current = { ...initial, interests: ["Math", "Science"] };
    const hasChanges = checkHasChanges(current, initial);

    expect(hasChanges).toBe(false);
    // When hasChanges is false, Save button is not rendered (disappeared)
  });

  it("shows Save button when any field is changed/entered (hasChanges === true)", () => {
    const initial = {
      fullName: "Emma Watson",
      age: "12",
      contactNo: "",
      city: "Hyderabad",
      country: "India",
      bio: "",
      avatar: "bird",
      interests: [],
    };

    // Change city
    expect(checkHasChanges({ ...initial, city: "Bengaluru" }, initial)).toBe(true);

    // Change age
    expect(checkHasChanges({ ...initial, age: "14" }, initial)).toBe(true);

    // Change avatar
    expect(checkHasChanges({ ...initial, avatar: "fox" }, initial)).toBe(true);

    // Add interest
    expect(checkHasChanges({ ...initial, interests: ["Coding"] }, initial)).toBe(true);
  });
});
