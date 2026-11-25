import { sanitizePhoneNumber } from "@/lib/utils";
import axios from "axios";

import { apiClient, unwrapData } from "@/lib/kidz/kidz-api-client";
import type { UserDTO } from "@/types/kidz/api.types";

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  phone?: string;
  avatarUrl?: string;
  avatar?: string;
  bio?: string;
  country?: string;
  city?: string;
  age?: string | number;
  headline?: string;
  expertise?: string;
  highestQualification?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  skills?: Array<{ skill: string }>;
  educations?: Array<{
    institutionName: string;
    degree: string;
    fieldOfStudy: string;
    startYear?: number;
    endYear?: number;
  }>;
  interests?: Array<{ interest: string }> | string[];
  preferredSubjects?: string[];
  [key: string]: unknown;
}

export interface PresignedAvatarResponse {
  presignedUrl: string;
  fileKey: string;
}

const isValidHttpUrl = (url: unknown): boolean =>
  typeof url === "string" && /^https?:\/\//i.test(url.trim());

export const profileService = {
  /**
   * Fetch full student profile: GET /api/users/me
   */
  async getProfile(): Promise<any> {
    const response = await apiClient.get<any>("/users/me");
    return unwrapData(response);
  },

  /**
   * Update student profile fields: PUT /api/users/me
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<any> {
    const body: Record<string, unknown> = { ...payload };

    if (Array.isArray(payload.interests)) {
      body.interests = payload.interests
        .map((item) =>
          typeof item === "string" ? { interest: item.trim() } : item,
        )
        .filter((item: any) => item && typeof item.interest === "string");
    }
    const rawPhone = payload.phoneNumber !== undefined ? payload.phoneNumber : payload.phone;
    if (rawPhone !== undefined) {
      const cleanPhone = sanitizePhoneNumber(rawPhone);
      body.phone = cleanPhone;
      body.phoneNumber = cleanPhone;
    }

    // Spring Boot validates avatarUrl with @URL constraint.
    // If avatarUrl is not a valid absolute http(s) URL (e.g. S3 fileKey, local preset, or empty),
    // omit it from the payload to avoid VAL_004 Invalid avatar URL errors.
    if (isValidHttpUrl(payload.avatarUrl)) {
      body.avatarUrl = (payload.avatarUrl as string).trim();
      body.avatar = (payload.avatarUrl as string).trim();
    } else if (isValidHttpUrl(payload.avatar)) {
      body.avatarUrl = (payload.avatar as string).trim();
      body.avatar = (payload.avatar as string).trim();
    } else {
      delete body.avatarUrl;
      delete body.avatar;
    }

    // Clean up socialLinks if any contain invalid URLs
    if (Array.isArray(body.socialLinks)) {
      body.socialLinks = (body.socialLinks as any[]).filter(
        (link) => link && isValidHttpUrl(link.url || link.link),
      );
    }

    const response = await apiClient.put<any>("/users/me", body);
    return unwrapData(response);
  },

  /**
   * Upload student avatar using 3-step presigned pipeline:
   * 1. Get presigned upload URL
   * 2. Direct PUT of file bytes to storage
   * 3. Confirm fileKey with LMS backend
   */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    // 1. Get presigned URL
    const presignedRes = await apiClient.post<PresignedAvatarResponse>(
      `/users/profile-picture/${userId}/upload-url`,
      { fileName: file.name },
    );
    const { presignedUrl, fileKey } = unwrapData<PresignedAvatarResponse>(presignedRes);

    // 2. PUT file bytes directly to storage (S3/GCS)
    await axios.put(presignedUrl, file, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });

    // 3. Confirm fileKey with LMS (this saves the profile picture on backend)
    const confirmRes = await apiClient.post<{ avatarUrl?: string; profilePictureUrl?: string }>(
      `/users/profile-picture?fileKey=${encodeURIComponent(fileKey)}`,
    );
    const confirmed = unwrapData<{ avatarUrl?: string; profilePictureUrl?: string }>(confirmRes);

    if (isValidHttpUrl(confirmed?.avatarUrl)) {
      return (confirmed.avatarUrl as string).trim();
    }
    if (isValidHttpUrl(confirmed?.profilePictureUrl)) {
      return (confirmed.profilePictureUrl as string).trim();
    }

    // Extract base URL from presigned S3 upload URL (without signature params)
    if (isValidHttpUrl(presignedUrl)) {
      const cleanUrl = presignedUrl.split("?")[0];
      if (isValidHttpUrl(cleanUrl)) {
        return cleanUrl;
      }
    }

    // Check if GET /users/me now reflects the new URL
    try {
      const meRes = await this.getProfile();
      const meUser = meRes?.data ?? meRes?.user ?? meRes;
      const meProfile = meUser?.profile ?? meUser;
      const meAvatar =
        meProfile?.avatarUrl || meProfile?.avatar || meUser?.avatarUrl || meUser?.avatar;
      if (isValidHttpUrl(meAvatar)) {
        return meAvatar;
      }
    } catch {}

    return "";
  },
};

export default profileService;
