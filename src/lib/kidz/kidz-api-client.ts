import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

const getKidzBaseUrl = (): string => {
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    return "/api";
  }
  return (import.meta.env.VITE_API_URL as string | undefined) || "/api";
};

export const API_BASE_URL: string = getKidzBaseUrl();

export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const isDebug = import.meta.env.VITE_DEBUG_API === "true";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

interface CustomInternalRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Singleton promise for ongoing token refresh to prevent concurrent stampedes
let refreshPromise: Promise<string | null> | null = null;

/**
 * Sanitizes object data for debug logging so sensitive credentials are not leaked.
 */
function sanitizeLogData(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  if (data instanceof FormData) return "[FormData]";

  try {
    const cloned = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
    const sensitiveKeys = ["password", "token", "refreshToken", "accessToken", "otp", "code", "secret"];

    for (const key of Object.keys(cloned)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        cloned[key] = "***REDACTED***";
      } else if (typeof cloned[key] === "object" && cloned[key] !== null) {
        cloned[key] = sanitizeLogData(cloned[key]);
      }
    }
    return cloned;
  } catch {
    return "[Unserializable Data]";
  }
}

// ----------------------------------------------------
// Request Interceptor
// ----------------------------------------------------
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 1. Bearer Token
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    // 2. Tenant ID
    const tenantId = localStorage.getItem("tenantId") || DEFAULT_TENANT_ID;
    config.headers.set("X-Tenant-Id", tenantId);

    // 2b. Learning Sector (Always KIDS for kidz client)
    config.headers.set("X-User-Learning-Sector", "KIDS");

    // 3. Let browser set multipart boundary for FormData
    if (config.data instanceof FormData) {
      config.headers.delete("Content-Type");
    }

    // 4. Debug Request Logging
    if (isDebug) {
      console.log(
        `[API REQ] ${config.method?.toUpperCase()} ${config.baseURL || ""}${config.url || ""}`,
        sanitizeLogData(config.data),
      );
    }

    return config;
  },
  (error) => {
    if (isDebug) {
      console.error("[API REQ ERROR]", error);
    }
    return Promise.reject(error);
  },
);

// ----------------------------------------------------
// Response Interceptor with Concurrent Token Refresh Queue
// ----------------------------------------------------
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (isDebug) {
      console.log(
        `[API RES ${response.status}] ${response.config.method?.toUpperCase()} ${response.config.url}`,
        sanitizeLogData(response.data),
      );
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as CustomInternalRequestConfig | undefined;

    if (isDebug) {
      console.warn(
        `[API ERR ${error.response?.status || "NET"}] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}:`,
        sanitizeLogData(error.response?.data) || error.message,
      );
    }

    // Skip refresh if this is already an auth call (login, register, refresh)
    const isAuthRoute =
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/verify-otp") ||
      originalRequest?.url?.includes("/auth/register");

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            try {
              const refreshRes = await axios.post<{ data?: { accessToken?: string }; accessToken?: string }>(
                `${API_BASE_URL}/auth/refresh`,
                { refreshToken },
                {
                  headers: {
                    "Content-Type": "application/json",
                    "X-Tenant-Id": localStorage.getItem("tenantId") || DEFAULT_TENANT_ID,
                  },
                },
              );

              const newAccessToken =
                refreshRes.data?.data?.accessToken ||
                refreshRes.data?.accessToken;

              if (newAccessToken) {
                localStorage.setItem("accessToken", newAccessToken);
                return newAccessToken;
              }
              return null;
            } catch {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("Edvanz_user");
              const targetLogin = window.location.pathname.startsWith("/kidz") ? "/kidz/login" : "/login";
              if (window.location.pathname !== targetLogin) {
                window.location.href = targetLogin;
              }
              return null;
            } finally {
              refreshPromise = null;
            }
          })();
        }

        const newAccessToken = await refreshPromise;
        if (newAccessToken) {
          originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
          return apiClient(originalRequest);
        }
      }

      // No refresh token available or refresh failed
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("Edvanz_user");
      const targetLogin = window.location.pathname.startsWith("/kidz") ? "/kidz/login" : "/login";
      if (window.location.pathname !== targetLogin) {
        window.location.href = targetLogin;
      }
    }

    return Promise.reject(error);
  },
);

// ----------------------------------------------------
// Helper Extraction Utilities
// ----------------------------------------------------

/**
 * Extracts payload data from standard LMS envelope: { success: boolean, data: T } or plain T
 */
export function unwrapData<T>(response: AxiosResponse<unknown> | unknown): T {
  if (!response) {
    return response as T;
  }

  // Handle AxiosResponse
  const resData =
    typeof response === "object" && response !== null && "data" in response
      ? (response as AxiosResponse<unknown>).data
      : response;

  if (resData && typeof resData === "object" && "data" in resData) {
    return (resData as { data: T }).data;
  }

  return resData as T;
}

/**
 * Safely extracts array from paginated ({ content: [] }), list wrapper ({ items: [] }), or plain array
 */
export function unwrapArray<T>(response: AxiosResponse<unknown> | unknown): T[] {
  const unwrapped = unwrapData<unknown>(response);

  if (Array.isArray(unwrapped)) {
    return unwrapped as T[];
  }

  if (unwrapped && typeof unwrapped === "object") {
    const maybeObj = unwrapped as Record<string, unknown>;
    if (Array.isArray(maybeObj["classes"])) {
      return maybeObj["classes"] as T[];
    }
    if (Array.isArray(maybeObj["liveClasses"])) {
      return maybeObj["liveClasses"] as T[];
    }
    if (Array.isArray(maybeObj["content"])) {
      return maybeObj["content"] as T[];
    }
    if (Array.isArray(maybeObj["items"])) {
      return maybeObj["items"] as T[];
    }
    if (Array.isArray(maybeObj["data"])) {
      return maybeObj["data"] as T[];
    }
    if (maybeObj["courses"] && typeof maybeObj["courses"] === "object") {
      const coursesObj = maybeObj["courses"] as Record<string, unknown>;
      if (Array.isArray(coursesObj["content"])) {
        return coursesObj["content"] as T[];
      }
      if (Array.isArray(coursesObj)) {
        return coursesObj as T[];
      }
    }
    if (maybeObj["liveCourses"] && typeof maybeObj["liveCourses"] === "object") {
      const liveObj = maybeObj["liveCourses"] as Record<string, unknown>;
      if (Array.isArray(liveObj["content"])) {
        return liveObj["content"] as T[];
      }
      if (Array.isArray(liveObj)) {
        return liveObj as T[];
      }
    }
  }

  return [];
}

/**
 * Multi-property lookup to resolve avatar/image URL from student profile or instructor DTOs
 */
export function extractAvatarUrl(source: unknown): string | undefined {
  if (!source || typeof source !== "object") return undefined;
  const s = source as Record<string, unknown>;

  const candidates = [
    s["avatarUrl"],
    s["profilePictureUrl"],
    s["avatar"],
    s["picture"],
    s["image"],
    s["imageUrl"],
    s["photoUrl"],
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return undefined;
}
