import { authService as baseAuthService } from "@/services/auth.service";
import type {
  AuthVerifyOtpResponse,
  LoginPayload,
  RegisterPayload,
  UserDTO,
  VerifyOtpPayload,
} from "@/types/kidz/api.types";

/**
 * Kidz Auth Adapter - Delegates to the single existing auth.service.
 * Identifies the learning sector based on learningSector: "KIDS" and role: "STUDENT".
 */
export const authService = {
  /**
   * Request OTP code to student email for passwordless/OTP login
   */
  async login(payload: LoginPayload): Promise<{ message?: string; success?: boolean }> {
    const response = await baseAuthService.login({ email: payload.email });
    return ((response as any)?.data ?? response) as { message?: string; success?: boolean };
  },

  /**
   * Send OTP code to student email
   */
  async sendOtp(email: string): Promise<{ message?: string; success?: boolean }> {
    const response = await baseAuthService.sendOtp({ email });
    return response as { message?: string; success?: boolean };
  },

  /**
   * Verify student OTP code and obtain auth tokens
   */
  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthVerifyOtpResponse> {
    const response = await baseAuthService.verifyLoginOtp(payload.email, payload.otp);
    const data = (response as any)?.data ?? response;
    return {
      token: data?.token || "",
      refreshToken: data?.refreshToken || "",
      userId: data?.userId || data?.id || "",
      email: data?.email || payload.email,
      role: data?.role || "STUDENT",
      tenantId: data?.tenantId,
    };
  },

  /**
   * Register a new student account using existing backend API contract
   * Sends role: "STUDENT" and learningSector: "KIDS"
   */
  async register(payload: RegisterPayload): Promise<UserDTO> {
    const response = await baseAuthService.registerWithDetails({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName || "Student",
      password: payload.password || "Edvanz@2026",
      country: (payload as any).country || "India",
      city: (payload as any).city || "Hyderabad",
      phone: (payload as any).phone || "",
      role: "KIDS",
      learningSector: "KIDS",
    });

    return {
      id: payload.email,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName || "Student",
      role: "KIDS",
      ...(response as any),
    } as UserDTO;
  },

  /**
   * Fetch current authenticated student profile
   */
  async getCurrentUser(): Promise<UserDTO> {
    const response = await baseAuthService.getCurrentUser();
    const data = (response as any)?.data ?? response;
    return data as UserDTO;
  },

  /**
   * Terminate student session
   */
  async logout(): Promise<void> {
    await baseAuthService.logout();
  },

  /**
   * Refresh session access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    return { accessToken: refreshToken };
  },
};
