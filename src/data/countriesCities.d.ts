export interface CountryCityData {
  name: string;
  code: string;
  dialCode: string;
  cities: string[];
}

export declare const countries: CountryCityData[];
export declare const getCountryByNameOrCode: (nameOrCode: string) => CountryCityData | null;
export declare const getCitiesByCountry: (countryNameOrCode: string) => string[];
export declare const getDialCodeByCountry: (countryNameOrCode: string) => string;
