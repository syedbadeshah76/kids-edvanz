import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authService } from "@/services/kidz/auth.service";
import type { RegisterPayload, StudentUser, UserDTO } from "@/types/kidz/api.types";

export interface KidzAuthContextValue {
  user: StudentUser | null;
  profile: UserDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithOtp: (email: string) => Promise<{ message?: string; success?: boolean }>;
  verifyOtp: (email: string, otp: string) => Promise<StudentUser>;
  register: (payload: RegisterPayload) => Promise<UserDTO>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserDTO | null>;
}

const KidzAuthContext = createContext<KidzAuthContextValue | null>(null);

const STORAGE_USER_KEY = "Edvanz_user";

export function KidzAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StudentUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id && parsed.email) {
          return {
            id: String(parsed.id),
            email: String(parsed.email),
            role: (parsed.role === "kids" || parsed.role === "KIDS" || parsed.learningSector === "KIDS") ? "kids" : "student",
            learningSector: parsed.learningSector,
            firstName: parsed.firstName || (parsed.name ? parsed.name.split(" ")[0] : undefined),
            lastName: parsed.lastName || (parsed.name ? parsed.name.split(" ").slice(1).join(" ") : undefined),
            displayName: parsed.displayName || parsed.name || parsed.email.split("@")[0] || "Student",
            avatarUrl: parsed.avatarUrl || parsed.profilePictureUrl || parsed.avatar,
          };
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  });

  const [profile, setProfile] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async (): Promise<UserDTO | null> => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setProfile(null);
      setUser(null);
      return null;
    }

    try {
      const res = await authService.getCurrentUser();
      const userDto: any =
        (res as any)?.data?.user ??
        (res as any)?.data ??
        (res as any)?.user ??
        res;
      setProfile(userDto);

      const normalized: StudentUser = {
        id: userDto.id,
        email: userDto.email,
        role: (userDto.role?.toLowerCase() === "kids" || userDto.learningSector === "KIDS") ? "kids" : "student",
        learningSector: userDto.learningSector || userDto.profile?.learningSector || "KIDS",
        ...(userDto.firstName
          ? { firstName: userDto.firstName }
          : userDto.profile?.firstName
            ? { firstName: userDto.profile.firstName }
            : {}),
        ...(userDto.lastName
          ? { lastName: userDto.lastName }
          : userDto.profile?.lastName
            ? { lastName: userDto.profile.lastName }
            : {}),
        displayName:
          [
            userDto.firstName || userDto.profile?.firstName,
            userDto.lastName || userDto.profile?.lastName,
          ]
            .filter(Boolean)
            .join(" ") ||
          userDto.email.split("@")[0] ||
          "Student",
        ...(userDto.avatarUrl || userDto.profilePictureUrl || userDto.profile?.avatarUrl
          ? {
              avatarUrl:
                userDto.avatarUrl ||
                userDto.profilePictureUrl ||
                userDto.profile?.avatarUrl,
            }
          : {}),
      };

      setUser(normalized);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(normalized));
      return userDto;
    } catch (err) {
      console.warn("Unable to fetch current user profile:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      void refreshProfile().finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [refreshProfile]);

  const loginWithOtp = useCallback(async (email: string) => {
    return await authService.login({ email });
  }, []);

  const verifyOtp = useCallback(
    async (email: string, otp: string): Promise<StudentUser> => {
      setIsLoading(true);
      try {
        const authData = await authService.verifyOtp({ email, otp });

        localStorage.setItem("accessToken", authData.token);
        localStorage.setItem("refreshToken", authData.refreshToken);
        if (authData.tenantId) {
          localStorage.setItem("tenantId", authData.tenantId);
        }

        const minimal: StudentUser = {
          id: authData.userId || "temp-student-id",
          email: authData.email || email,
          role: (userDto.role?.toLowerCase() === "kids" || userDto.learningSector === "KIDS") ? "kids" : "student",
          displayName: (authData.email || email).split("@")[0] || "Student",
        };

        setUser(minimal);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(minimal));

        // Rehydrate full details in background
        void refreshProfile();

        return minimal;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshProfile],
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<UserDTO> => {
      setIsLoading(true);
      try {
        const created = await authService.register(payload);
        return created;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith("kidzy-app-state") ||
              key.startsWith("edvanz_kidz_") ||
              key.startsWith("kidz_") ||
              key === "Edvanz_user" ||
              key === "edvanz_user")
          ) {
            keysToRemove.push(key);
          }
        }
        for (const k of keysToRemove) {
          localStorage.removeItem(k);
        }
      } catch {}

      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("Edvanz_user");
      setUser(null);
      setProfile(null);
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<KidzAuthContextValue>(
    () => ({
      user,
      profile,
      isAuthenticated: Boolean(user && localStorage.getItem("accessToken")),
      isLoading,
      loginWithOtp,
      verifyOtp,
      register,
      logout,
      refreshProfile,
    }),
    [user, profile, isLoading, loginWithOtp, verifyOtp, register, logout, refreshProfile],
  );

  return <KidzAuthContext.Provider value={value}>{children}</KidzAuthContext.Provider>;
}

export function useKidzAuth(): KidzAuthContextValue {
  const context = useContext(KidzAuthContext);
  if (!context) {
    throw new Error("useKidzAuth must be used within a KidzAuthProvider");
  }
  return context;
}

// Alias for convenience across kidz components
export const useAuth = useKidzAuth;
