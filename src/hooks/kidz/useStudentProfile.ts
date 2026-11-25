import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { profileService, type UpdateProfilePayload } from "@/services/kidz/profile.service";
import type { UserDTO } from "@/types/kidz/api.types";
import { extractErrorMessage } from "@/lib/kidz/kidz-api-error";

export function useStudentProfile() {
  const [profile, setProfile] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await profileService.getProfile();
      setProfile(data);
      return data;
    } catch (err) {
      console.warn("Could not load user profile:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    setIsSaving(true);
    try {
      const updated = await profileService.updateProfile(payload);
      setProfile(updated);
      toast.success("Profile updated successfully!");
      return updated;
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to update profile"));
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!profile?.id) {
        toast.error("Profile not loaded. Cannot upload avatar.");
        return null;
      }
      setIsSaving(true);
      try {
        const avatarUrl = await profileService.uploadAvatar(profile.id, file);
        setProfile((prev) => (prev ? { ...prev, avatarUrl } : prev));
        toast.success("Profile picture updated!");
        return avatarUrl;
      } catch (err) {
        toast.error(extractErrorMessage(err, "Failed to upload avatar"));
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [profile?.id],
  );

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    isSaving,
    fetchProfile,
    updateProfile,
    uploadAvatar,
  };
}
