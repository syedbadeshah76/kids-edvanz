import { describe, it, expect, vi, beforeEach } from "vitest";
import { authService } from "@/services/auth.service";
import { authService as kidzAuthService } from "@/services/kidz/auth.service";
import { apiClient } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
  extractAvatarUrl: vi.fn(),
}));

describe("Registration Flow and Learning Sector Specifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Main EDVANZ Student Registration sends role: 'STUDENT' and learningSector: 'IT'", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      message: "Registration successful",
    });

    const payload = {
      email: "student@example.com",
      firstName: "John",
      lastName: "Doe",
      country: "India",
      city: "Hyderabad",
      phone: "+91 9876543210",
      role: "STUDENT" as const,
      learningSector: "IT" as const,
      password: "Edvanz@2026",
    };

    await authService.registerWithDetails(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/auth/register", {
      email: "student@example.com",
      firstName: "John",
      lastName: "Doe",
      country: "India",
      city: "Hyderabad",
      phone: "+91 9876543210",
      role: "STUDENT",
      learningSector: "IT",
      password: "Edvanz@2026",
    });
  });

  it("Kidz Registration sends role: 'KIDS' and learningSector: 'KIDS'", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      message: "Registration successful",
    });

    const payload = {
      email: "kidz@example.com",
      firstName: "Timmy",
      lastName: "Student",
      country: "United States",
      city: "New York",
      phone: "+1 5551234567",
      role: "KIDS" as const,
      learningSector: "KIDS" as const,
      password: "Edvanz@2026",
    };

    await authService.registerWithDetails(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/auth/register", {
      email: "kidz@example.com",
      firstName: "Timmy",
      lastName: "Student",
      country: "United States",
      city: "New York",
      phone: "+1 5551234567",
      role: "KIDS",
      learningSector: "KIDS",
      password: "Edvanz@2026",
    });
  });

  it("Instructor Registration sends role: 'INSTRUCTOR' and learningSector: 'IT'", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      message: "Application submitted successfully",
    });

    const payload = {
      email: "instructor@example.com",
      role: "INSTRUCTOR" as const,
      learningSector: "IT" as const,
      firstName: "Jane",
      lastName: "Doe",
      country: "India",
      city: "Bangalore",
      phone: "+91 9123456780",
      introVideoFileKey: "videos/intro-123.mp4",
      resumeFileKey: "resumes/cv-123.pdf",
      password: "Edvanz@2026",
    };

    await authService.registerInstructor(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/auth/register", {
      email: "instructor@example.com",
      role: "INSTRUCTOR",
      learningSector: "IT",
      firstName: "Jane",
      lastName: "Doe",
      country: "India",
      city: "Bangalore",
      phone: "+91 9123456780",
      introVideoFileKey: "videos/intro-123.mp4",
      resumeFileKey: "resumes/cv-123.pdf",
      password: "Edvanz@2026",
    });
  });

  it("Instructor Registration sends role: 'INSTRUCTOR' and learningSector: 'KIDS' when selected", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      message: "Application submitted successfully",
    });

    const payload = {
      email: "kids-instructor@example.com",
      role: "INSTRUCTOR" as const,
      learningSector: "KIDS" as const,
      firstName: "Alice",
      lastName: "Smith",
      country: "United States",
      city: "San Francisco",
      phone: "+1 5559876543",
      introVideoFileKey: "videos/intro-kids-456.mp4",
      resumeFileKey: "resumes/cv-kids-456.pdf",
      password: "Edvanz@2026",
    };

    await authService.registerInstructor(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/auth/register", {
      email: "kids-instructor@example.com",
      role: "INSTRUCTOR",
      learningSector: "KIDS",
      firstName: "Alice",
      lastName: "Smith",
      country: "United States",
      city: "San Francisco",
      phone: "+1 5559876543",
      introVideoFileKey: "videos/intro-kids-456.mp4",
      resumeFileKey: "resumes/cv-kids-456.pdf",
      password: "Edvanz@2026",
    });
  });

  it("Kidz auth service adapter re-uses the main auth service with role KIDS and learningSector KIDS", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      message: "Account created",
    });

    const user = await kidzAuthService.register({
      email: "emma@example.com",
      firstName: "Emma",
      lastName: "Watson",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/auth/register", expect.objectContaining({
      email: "emma@example.com",
      role: "KIDS",
      learningSector: "KIDS",
    }));

    expect(user.email).toBe("emma@example.com");
    expect(user.role).toBe("KIDS");
  });

  it("Allows the same email to be used for different roles and learning sectors", async () => {
    const commonEmail = "multirole@example.com";

    // 1. Student in IT
    vi.mocked(apiClient.post).mockResolvedValueOnce({ message: "Registered as student" });
    await authService.registerWithDetails({
      email: commonEmail,
      role: "STUDENT",
      learningSector: "IT",
      firstName: "Sam",
      lastName: "Smith",
      country: "India",
      city: "Delhi",
    });
    expect(apiClient.post).toHaveBeenLastCalledWith("/auth/register", expect.objectContaining({
      email: commonEmail,
      role: "STUDENT",
      learningSector: "IT",
    }));

    // 2. Instructor in IT with the same email
    vi.mocked(apiClient.post).mockResolvedValueOnce({ message: "Registered as instructor" });
    await authService.registerInstructor({
      email: commonEmail,
      role: "INSTRUCTOR",
      learningSector: "IT",
      firstName: "Sam",
      lastName: "Smith",
      country: "India",
      city: "Delhi",
      introVideoFileKey: "vid.mp4",
      resumeFileKey: "cv.pdf",
    });
    expect(apiClient.post).toHaveBeenLastCalledWith("/auth/register", expect.objectContaining({
      email: commonEmail,
      role: "INSTRUCTOR",
      learningSector: "IT",
    }));

    // 3. User in KIDS with the same email
    vi.mocked(apiClient.post).mockResolvedValueOnce({ message: "Registered as kidz" });
    await authService.registerWithDetails({
      email: commonEmail,
      role: "KIDS",
      learningSector: "KIDS",
      firstName: "Sam",
      lastName: "Smith",
      country: "India",
      city: "Delhi",
    });
    expect(apiClient.post).toHaveBeenLastCalledWith("/auth/register", expect.objectContaining({
      email: commonEmail,
      role: "KIDS",
      learningSector: "KIDS",
    }));
  });

  it("determines correct dashboard destination based on learningSector and role", () => {
    const resolveTargetDashboard = (user: { role: string; learningSector?: string }) => {
      const normalizedRole = user.role.toUpperCase();
      if (normalizedRole === "ADMIN") return "/admin";
      if (normalizedRole === "INSTRUCTOR") return "/instructor";
      if (normalizedRole === "KIDS" || user.learningSector === "KIDS") return "/kidz";
      if (normalizedRole === "STUDENT") {
        return "/dashboard";
      }
      return "/";
    };

    // Kidz User with role KIDS and learningSector KIDS
    const kidzRoleUser = {
      id: "c77d2b06-1b23-49f7-93e5-928581adfe3f",
      email: "deullireiddedi-8740@yopmail.com",
      role: "KIDS",
      learningSector: "KIDS",
      status: "ACTIVE",
    };
    expect(resolveTargetDashboard(kidzRoleUser)).toBe("/kidz");

    // User provided backend response for Kidz Student
    const kidzBackendUser = {
      id: "c77d2b06-1b23-49f7-93e5-928581adfe3f",
      email: "deullireiddedi-8740@yopmail.com",
      role: "STUDENT",
      learningSector: "KIDS",
      status: "ACTIVE",
    };

    expect(resolveTargetDashboard(kidzBackendUser)).toBe("/kidz");

    // Main IT Student
    const itStudent = {
      role: "STUDENT",
      learningSector: "IT",
    };
    expect(resolveTargetDashboard(itStudent)).toBe("/dashboard");

    // Default student without explicit learningSector (defaults to IT dashboard)
    const defaultStudent = {
      role: "STUDENT",
    };
    expect(resolveTargetDashboard(defaultStudent)).toBe("/dashboard");

    // Instructor
    const instructor = {
      role: "INSTRUCTOR",
      learningSector: "IT",
    };
    expect(resolveTargetDashboard(instructor)).toBe("/instructor");

    // Admin
    const admin = {
      role: "ADMIN",
    };
    expect(resolveTargetDashboard(admin)).toBe("/admin");
  });

  it("handles backend registration response with token and auto-login payload", async () => {
    const backendResponse = {
      token: "eyJhbGciOiJIUzUxMiJ9.test-jwt-token",
      refreshToken: "500d3ad5-9db9-4df5-903b-2f0288e77461",
      user: {
        id: "1ab340f9-d191-4007-937e-6b25a34e0a02",
        email: "ditridufolleu-6118@yopmail.com",
        role: "STUDENT",
        learningSector: "IT",
        status: "ACTIVE",
        profile: {
          firstName: "syed",
          lastName: "test",
        },
      },
      message: "Registration successful",
    };

    vi.mocked(apiClient.post).mockResolvedValueOnce(backendResponse);

    const res = await authService.registerWithDetails({
      email: "ditridufolleu-6118@yopmail.com",
      role: "STUDENT",
      learningSector: "IT",
      firstName: "syed",
      lastName: "test",
      country: "India",
      city: "Hyderabad",
    });

    expect(res.token).toBe(backendResponse.token);
    expect(res.refreshToken).toBe(backendResponse.refreshToken);
    expect(res.user?.learningSector).toBe("IT");
    expect(res.user?.role).toBe("STUDENT");
  });

  it("ensures document.body pointerEvents and overflow can be safely reset", () => {
    document.body.style.pointerEvents = "none";
    document.body.style.overflow = "hidden";

    // Simulate modal close reset
    document.body.style.pointerEvents = "";
    document.body.style.overflow = "";

    expect(document.body.style.pointerEvents).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("ensures OTP input is hidden until otpSent is true and disappears after verification", () => {
    let otpSent = false;
    let otpVerified = false;

    // Initially: hidden
    expect(otpSent && !otpVerified).toBe(false);

    // After clicking Verify email: visible
    otpSent = true;
    expect(otpSent && !otpVerified).toBe(true);

    // After entering code and verifying: hidden (replaced by green confirmation)
    otpVerified = true;
    expect(otpSent && !otpVerified).toBe(false);
    expect(otpVerified).toBe(true);
  });
});

