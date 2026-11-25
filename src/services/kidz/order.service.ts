import { apiClient, unwrapData } from "@/lib/kidz/kidz-api-client";
import type { CheckoutOrderResponse, CheckoutRequest } from "@/types/kidz/api.types";

export const orderService = {
  /**
   * Create an order from current cart or checkout payload
   */
  async checkout(payload: CheckoutRequest = {}): Promise<CheckoutOrderResponse> {
    const response = await apiClient.post<CheckoutOrderResponse>(
      "/orders/checkout",
      payload,
    );
    return unwrapData(response);
  },
};
