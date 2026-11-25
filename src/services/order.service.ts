import { apiClient } from "@/lib/api-client";

export interface OrderItem {
  id?: string;
  productId?: string;
  productType?: "COURSE" | "LIVE_COURSE";
  productName?: string;
  product_name?: string;
  courseId?: string;
  courseName?: string;
  course_name?: string;
  courseTitle?: string;
  course_title?: string;
  title?: string;
  name?: string;
  course?: string | { id?: string; title?: string; name?: string };
  product?: string | { id?: string; title?: string; name?: string };
  price?: number;
  discountedPrice?: number;
  originalPrice?: number;
  thumbnail?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items?: OrderItem[];
  courses?: OrderItem[];
  orderItems?: OrderItem[];
  subtotal?: number;
  discountAmount?: number;
  taxPercentage?: number;
  taxAmount?: number;
  totalAmount?: number;
  amount?: number;
  couponCode?: string;
  currency?: string;
  paymentId?: string;
  paymentMethod?: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "PAID" | "CANCELLED" | string;
  createdAt: string | null;
  purchaseDate?: string;
  courseTitle?: string;
  course_title?: string;
  courseName?: string;
  course_name?: string;
  title?: string;
  name?: string;
  productName?: string;
  product_name?: string;
  courseThumbnail?: string;
  thumbnail?: string;
  invoiceUrl?: string;
  isGift?: boolean;
  recipientName?: string;
  recipientEmail?: string;
  giftMessage?: string;
}

export interface CheckoutOptions {
  couponCode?: string;
  code?: string;
  coupon?: string;
  couponId?: string;
  coinsToRedeem?: number | null;
  discountAmount?: number;
  discount?: number;
  subtotal?: number;
  totalAmount?: number;
  amount?: number;
  currency?: string;
}

export const orderService = {
  checkout: (
    couponOrOptions?: string | CheckoutOptions,
    coinsToRedeem: number | null = null
  ) => {
    const payload: Record<string, unknown> = {};
    const queryParams: Record<string, string> = {};

    if (typeof couponOrOptions === "object" && couponOrOptions !== null) {
      const opts = couponOrOptions;
      const cleanCode = (opts.couponCode || opts.code || opts.coupon || "").trim();
      if (cleanCode) {
        payload.couponCode = cleanCode;
        payload.code = cleanCode;
        payload.coupon = cleanCode;
        queryParams.couponCode = cleanCode;
        queryParams.code = cleanCode;
        queryParams.coupon = cleanCode;
      }
      if (opts.couponId) {
        payload.couponId = String(opts.couponId).trim();
        queryParams.couponId = String(opts.couponId).trim();
      }
      if (opts.discountAmount != null && opts.discountAmount > 0) {
        payload.discountAmount = opts.discountAmount;
        payload.discount = opts.discountAmount;
      }
      if (opts.coinsToRedeem != null && opts.coinsToRedeem > 0) {
        payload.coinsToRedeem = opts.coinsToRedeem;
        payload.coins = opts.coinsToRedeem;
      }
      if (opts.totalAmount != null) {
        payload.totalAmount = opts.totalAmount;
        payload.amount = opts.totalAmount;
      }
      if (opts.subtotal != null) {
        payload.subtotal = opts.subtotal;
      }
      if (opts.currency) {
        payload.currency = opts.currency;
      }
    } else {
      const cleanCode = (couponOrOptions || "").trim();
      if (cleanCode) {
        payload.couponCode = cleanCode;
        payload.code = cleanCode;
        payload.coupon = cleanCode;
        queryParams.couponCode = cleanCode;
        queryParams.code = cleanCode;
        queryParams.coupon = cleanCode;
      }
      if (coinsToRedeem != null && coinsToRedeem > 0) {
        payload.coinsToRedeem = coinsToRedeem;
        payload.coins = coinsToRedeem;
      }
    }

    return apiClient.post<Order>("/orders/checkout", payload, {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
  },
  freeEnroll: (courseId: string, productId?: string) =>
    apiClient.post<Order>("/orders/enroll", { courseId, ...(productId ? { productId } : {}) }),
  listOrders: () => apiClient.get<Order[]>("/orders"),
  getOrder: (orderId: string) => apiClient.get<Order>(`/orders/${orderId}`),
  getInvoice: (orderId: string) => apiClient.get<unknown>(`/orders/${orderId}/invoice`),
  downloadInvoiceUrl: (orderId: string) => `/api/orders/${orderId}/invoice`,
};
