import { apiClient, unwrapData } from "@/lib/kidz/kidz-api-client";
import type { CartDTO } from "@/types/kidz/api.types";

export const cartService = {
  /**
   * Get student's active cart
   */
  async getCart(): Promise<CartDTO> {
    const response = await apiClient.get<CartDTO>("/cart");
    return unwrapData(response);
  },

  /**
   * Add a course/item to cart
   */
  async addToCart(productId: string): Promise<CartDTO> {
    const response = await apiClient.post<CartDTO>("/cart/items", { productId });
    return unwrapData(response);
  },

  /**
   * Remove an item from cart
   */
  async removeFromCart(productId: string): Promise<CartDTO> {
    const response = await apiClient.delete<CartDTO>(`/cart/items/${productId}`);
    return unwrapData(response);
  },
};
