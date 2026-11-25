import { apiClient, unwrapData } from "@/lib/kidz/kidz-api-client";
import type {
  PaymentInitiateResponse,
  PaymentVerifyRequest,
  PaymentVerifyResponse,
} from "@/types/kidz/api.types";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

export const razorpayService = {
  /**
   * Dynamically loads Razorpay checkout script if not already present
   */
  async loadRazorpayScript(): Promise<boolean> {
    if (typeof window !== "undefined" && window.Razorpay) {
      return true;
    }

    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  },

  /**
   * Initiate payment for an existing order ID
   */
  async initiatePayment(orderId: string): Promise<PaymentInitiateResponse> {
    const response = await apiClient.post<PaymentInitiateResponse>(
      `/payments/initiate?orderId=${encodeURIComponent(orderId)}`,
    );
    return unwrapData(response);
  },

  /**
   * Verify completed payment signature with LMS backend
   */
  async verifyPayment(payload: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    const response = await apiClient.post<PaymentVerifyResponse>(
      "/payments/verify",
      payload,
    );
    return unwrapData(response);
  },

  /**
   * Full Razorpay checkout flow:
   * 1. Initiates payment on LMS
   * 2. Loads script
   * 3. Displays Razorpay Modal
   * 4. Verifies signature with LMS
   */
  async processPayment(params: {
    orderId: string;
    studentName?: string | undefined;
    studentEmail?: string | undefined;
    courseTitle?: string | undefined;
  }): Promise<PaymentVerifyResponse> {
    const paymentData = await this.initiatePayment(params.orderId);

    const isLoaded = await this.loadRazorpayScript();
    const RazorpayConstructor = window.Razorpay;
    if (!isLoaded || !RazorpayConstructor) {
      throw new Error("Failed to load Razorpay payment gateway. Please check your internet connection.");
    }

    return new Promise((resolve, reject) => {
      const rzpOptions: Record<string, unknown> = {
        key: paymentData.razorpayKeyId,
        amount: paymentData.amount,
        currency: paymentData.currency || "INR",
        name: "EDVANZ Learning Portal",
        description: params.courseTitle || "Course Enrollment",
        order_id: paymentData.razorpayOrderId,
        prefill: {
          name: params.studentName || "",
          email: params.studentEmail || "",
        },
        theme: {
          color: "#2563eb",
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verification = await razorpayService.verifyPayment({
              orderId: params.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            resolve(verification);
          } catch (verifyError) {
            reject(verifyError);
          }
        },
        modal: {
          ondismiss: () => {
            reject(new Error("Payment cancelled by user"));
          },
        },
      };

      const rzp = new RazorpayConstructor(rzpOptions);
      rzp.open();
    });
  },
};
