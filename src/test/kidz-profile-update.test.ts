import { describe, it, expect, vi, beforeEach } from "vitest";
import { profileService } from "@/services/kidz/profile.service";
import { apiClient } from "@/lib/kidz/kidz-api-client";

vi.mock("@/lib/kidz/kidz-api-client", () => {
  const mockApiClient = {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  };
  return {
    apiClient: mockApiClient,
    unwrapData: vi.fn((res) => {
      if (res && typeof res === "object" && "data" in res) {
        return (res as any).data;
      }
      return res;
    }),
  };
});

describe("Kidz Profile API Integration (/api/users/me)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches profile details from GET /api/users/me", async () => {
    const mockUser = {
      id: "kid-123",
      email: "emma.watson@gmail.com",
      role: "KIDS",
      profile: {
        firstName: "Emma",
        lastName: "Watson",
        age: "12",
        phoneNumber: "91+9876543211",
        city: "Hyderabad",
        country: "India",
        bio: "Curious learner who loves math and coding",
        avatarUrl: "bird",
      },
      interests: [
        { interest: "Math" },
        { interest: "Science" },
        { interest: "Coding" },
      ],
    };

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: mockUser,
    });

    const data = await profileService.getProfile();

    expect(apiClient.get).toHaveBeenCalledWith("/users/me");
    expect(data).toEqual(mockUser);
  });

  it("sends updated profile via PUT /api/users/me with correct field mapping", async () => {
    const payload = {
      firstName: "Arfath",
      lastName: "Khan",
      phoneNumber: "9701234567",
      avatarUrl: "https://example.com/avatar.jpg",
      bio: "Software developer passionate about backend systems.",
      country: "UAE",
      city: "Dubai",
      age: "14",
      headline: "Senior Backend Developer",
      expertise: "Java, Spring Boot, Microservices",
      highestQualification: "Bachelor of Technology",
      socialLinks: [
        { platform: "linkedin", url: "https://linkedin.com/in/arfath" },
        { platform: "github", url: "https://github.com/arfath" },
      ],
      skills: [{ skill: "Java" }, { skill: "Spring Boot" }],
      educations: [
        {
          institutionName: "XYZ University",
          degree: "Bachelor of Technology",
          fieldOfStudy: "Computer Science",
          startYear: 2018,
          endYear: 2022,
        },
      ],
      interests: [
        { interest: "Artificial Intelligence" },
        { interest: "Investing" },
        { interest: "Startups" },
      ],
    };

    vi.mocked(apiClient.put).mockResolvedValueOnce({
      success: true,
      data: payload,
    });

    const res = await profileService.updateProfile(payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/users/me",
      expect.objectContaining({
        firstName: "Arfath",
        lastName: "Khan",
        phoneNumber: "9701234567",
        phone: "9701234567",
        avatarUrl: "https://example.com/avatar.jpg",
        avatar: "https://example.com/avatar.jpg",
        bio: "Software developer passionate about backend systems.",
        country: "UAE",
        city: "Dubai",
        age: "14",
        interests: [
          { interest: "Artificial Intelligence" },
          { interest: "Investing" },
          { interest: "Startups" },
        ],
      }),
    );
    expect(res).toEqual(payload);
  });

  it("transforms string array of interests to objects array [{ interest: 'Math' }]", async () => {
    const payload = {
      firstName: "Emma",
      lastName: "Watson",
      interests: ["Math", "Science", "Coding"],
    };

    vi.mocked(apiClient.put).mockResolvedValueOnce({
      success: true,
      data: payload,
    });

    await profileService.updateProfile(payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/users/me",
      expect.objectContaining({
        firstName: "Emma",
        lastName: "Watson",
        interests: [
          { interest: "Math" },
          { interest: "Science" },
          { interest: "Coding" },
        ],
      }),
    );
  });

  it("omits avatarUrl if it is not an absolute HTTP/HTTPS URL (e.g. S3 fileKey or preset name) to prevent VAL_004 error", async () => {
    const payload = {
      firstName: "Emma",
      lastName: "Watson",
      avatarUrl: "profile-pic/e6e8819d-5764-4785-93c7-72f6a0db590d/1308398f-efa3-4420-b8dc-d72bb1673f20_Edvanz_Certifiacte (2).jpg",
    };

    vi.mocked(apiClient.put).mockResolvedValueOnce({
      success: true,
      data: payload,
    });

    await profileService.updateProfile(payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/users/me",
      expect.not.objectContaining({
        avatarUrl: expect.anything(),
      }),
    );
  });
});
