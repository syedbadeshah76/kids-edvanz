export const countries = [
  {
    name: "India",
    code: "IN",
    dialCode: "+91",
    cities: [
      "Hyderabad",
      "Mumbai",
      "Delhi",
      "Bangalore",
      "Chennai",
      "Kolkata",
      "Pune",
      "Ahmedabad",
      "Jaipur",
      "Lucknow"
    ]
  },
  {
    name: "United States",
    code: "US",
    dialCode: "+1",
    cities: [
      "New York",
      "Los Angeles",
      "Chicago",
      "Houston",
      "San Francisco",
      "Miami",
      "Seattle",
      "Boston"
    ]
  },
  {
    name: "United Kingdom",
    code: "GB",
    dialCode: "+44",
    cities: [
      "London",
      "Manchester",
      "Birmingham",
      "Liverpool",
      "Leeds",
      "Bristol",
      "Glasgow",
      "Edinburgh"
    ]
  },
  {
    name: "United Arab Emirates",
    code: "AE",
    dialCode: "+971",
    cities: [
      "Dubai",
      "Abu Dhabi",
      "Sharjah",
      "Ajman",
      "Fujairah",
      "Al Ain"
    ]
  },
  {
    name: "Canada",
    code: "CA",
    dialCode: "+1",
    cities: [
      "Toronto",
      "Vancouver",
      "Montreal",
      "Calgary",
      "Ottawa",
      "Edmonton",
      "Winnipeg"
    ]
  },
  {
    name: "Australia",
    code: "AU",
    dialCode: "+61",
    cities: [
      "Sydney",
      "Melbourne",
      "Brisbane",
      "Perth",
      "Adelaide",
      "Canberra",
      "Gold Coast"
    ]
  },
  {
    name: "Saudi Arabia",
    code: "SA",
    dialCode: "+966",
    cities: [
      "Riyadh",
      "Jeddah",
      "Mecca",
      "Medina",
      "Dammam",
      "Taif"
    ]
  },
  {
    name: "Pakistan",
    code: "PK",
    dialCode: "+92",
    cities: [
      "Karachi",
      "Lahore",
      "Islamabad",
      "Rawalpindi",
      "Faisalabad",
      "Multan",
      "Peshawar"
    ]
  },
  {
    name: "Singapore",
    code: "SG",
    dialCode: "+65",
    cities: [
      "Singapore"
    ]
  },
  {
    name: "Germany",
    code: "DE",
    dialCode: "+49",
    cities: [
      "Berlin",
      "Munich",
      "Hamburg",
      "Frankfurt",
      "Cologne",
      "Stuttgart",
      "Düsseldorf"
    ]
  }
];

export const getCountryByNameOrCode = (nameOrCode) => {
  if (!nameOrCode) return null;
  const query = String(nameOrCode).trim().toLowerCase();
  return (
    countries.find(
      (c) =>
        c.name.toLowerCase() === query ||
        c.code.toLowerCase() === query
    ) || null
  );
};

export const getCitiesByCountry = (countryNameOrCode) => {
  const match = getCountryByNameOrCode(countryNameOrCode);
  return match ? [...match.cities] : [];
};

export const getDialCodeByCountry = (countryNameOrCode) => {
  const match = getCountryByNameOrCode(countryNameOrCode);
  return match ? match.dialCode : "+91";
};
