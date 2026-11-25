import { apiClient, unwrapArray } from "@/lib/kidz/kidz-api-client";
import type { KidzCategoryDTO } from "@/types/kidz/api.types";

export const categoriesService = {
  /**
   * Fetch active categories for the Kidz learning sector (GET /categories?learningSector=KIDS)
   */
  async getCategories(): Promise<KidzCategoryDTO[]> {
    try {
      const response = await apiClient.get<KidzCategoryDTO[]>("/categories?learningSector=KIDS");
      const list = unwrapArray<KidzCategoryDTO>(response);
      return list.filter(
        (cat) => !cat.learningSector || cat.learningSector.toUpperCase() === "KIDS",
      );
    } catch (err) {
      console.warn("Failed to fetch Kidz categories:", err);
      return [];
    }
  },

  /**
   * Fetch subcategories for a given category ID in the Kidz sector
   */
  async getSubcategories(categoryId: string): Promise<KidzCategoryDTO[]> {
    try {
      const response = await apiClient.get<KidzCategoryDTO[]>(
        `/categories/${categoryId}/subcategories?learningSector=KIDS`,
      );
      const list = unwrapArray<KidzCategoryDTO>(response);
      return list.filter(
        (cat) => !cat.learningSector || cat.learningSector.toUpperCase() === "KIDS",
      );
    } catch (err) {
      console.warn("Failed to fetch Kidz subcategories:", err);
      return [];
    }
  },
};

export default categoriesService;
