import { countries, getCitiesByCountry } from "@/data/countriesCities";

class LocationService {
  async getCities(country: string): Promise<string[]> {
    return getCitiesByCountry(country);
  }

  getCountries() {
    return countries;
  }
}

export const locationService = new LocationService();
