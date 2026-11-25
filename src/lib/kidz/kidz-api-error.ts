/**
 * API Error Handling Utilities
 * Safely extracts human-friendly messages and maps backend business error codes.
 */

export interface BackendErrorResponse {
  code?: string;
  errorCode?: string;
  message?: string;
  error?: string;
  errors?: Record<string, string[] | string>;
  status?: number;
}

const ERROR_CODE_MAP: Record<string, string> = {
  USER_002: "This email address is already registered. Please sign in instead.",
  QUIZ_007: "This quiz has already been submitted.",
  RES_001: "The requested resource could not be found.",
  AUTH_001: "Invalid email or OTP code. Please try again.",
  AUTH_002: "Your session has expired. Please log in again.",
  COURSE_001: "You do not have access to this course yet.",
  ORDER_001: "Unable to process order. Please try again.",
  PAYMENT_001: "Payment verification failed. Please contact support.",
};

export class ApiError extends Error {
  public code?: string;
  public status?: number;
  public validationErrors?: Record<string, string[]>;

  constructor(message: string, code?: string, status?: number, validationErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    if (code !== undefined) this.code = code;
    if (status !== undefined) this.status = status;
    if (validationErrors !== undefined) this.validationErrors = validationErrors;
  }
}

/**
 * Extracts a user-friendly error string from an unknown error object (e.g. AxiosError).
 */
export function extractErrorMessage(error: unknown, fallbackMessage = "Something went wrong. Please try again."): string {
  if (!error) return fallbackMessage;

  if (typeof error === "string") {
    return error;
  }

  // Check if error is an object with response
  const maybeObj = error as {
    response?: {
      status?: number;
      data?: BackendErrorResponse | string;
    };
    message?: string;
    code?: string;
  };

  const responseData = maybeObj?.response?.data;

  if (responseData) {
    if (typeof responseData === "string") {
      return responseData;
    }

    // 1. Check for specific backend error code
    const rawCode = responseData.code || responseData.errorCode;
    if (rawCode && ERROR_CODE_MAP[rawCode]) {
      return ERROR_CODE_MAP[rawCode];
    }

    // 2. Check for validation errors dictionary (e.g. { email: ["Must be valid email"] })
    if (responseData.errors && typeof responseData.errors === "object") {
      const errorMap = responseData.errors;
      const firstKey = Object.keys(errorMap)[0];
      if (firstKey) {
        const val = errorMap[firstKey];
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") {
          return val[0];
        }
        if (typeof val === "string") {
          return val;
        }
      }
    }

    // 3. Check for message or error property
    if (responseData.message && typeof responseData.message === "string") {
      return responseData.message;
    }
    if (responseData.error && typeof responseData.error === "string") {
      return responseData.error;
    }
  }

  // Fallback to standard error message
  if (maybeObj?.message && typeof maybeObj.message === "string") {
    if (maybeObj.message.includes("Network Error")) {
      return "Network connection error. Please check your internet connection.";
    }
    if (maybeObj.message.includes("timeout")) {
      return "The request timed out. Please try again.";
    }
    return maybeObj.message;
  }

  return fallbackMessage;
}
