import { useState, useEffect, useRef, useMemo } from "react";
import {
  User,
  Mail,
  Calendar,
  Phone,
  Building2,
  Flag,
  Heart,
  Camera,
  Plus,
  Check,
  X,
  Loader2,
  ChevronDown,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/lib/kidz/kidz-app-state";
import { useAuth } from "@/contexts/kidz/KidzAuthContext";
import { profileService } from "@/services/kidz/profile.service";
import { useDocumentMeta } from "@/lib/kidz/kidz-meta";
import { getApiError } from "@/lib/api-error";
import { validatePhoneNumber, sanitizePhoneNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { countries, getCitiesByCountry, type CountryCityData } from "@/data/countriesCities";

// Curated avatar presets matching Kidz illustration style
const PRESET_AVATARS = [
  {
    id: "bird",
    label: "Finch",
    icon: "🐦",
    bg: "bg-[#fef3c7]",
    preview: (
      <svg viewBox="0 0 100 100" className="size-full">
        <circle cx="50" cy="50" r="48" fill="#fde68a" />
        <path d="M20 75 Q 50 65 80 75" stroke="#78350f" strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse cx="50" cy="52" rx="28" ry="24" fill="#f97316" />
        <path d="M30 45 Q 40 25 60 30 Q 75 35 72 52 Z" fill="#0284c7" />
        <circle cx="62" cy="42" r="4" fill="#0f172a" />
        <circle cx="63.5" cy="40.5" r="1.5" fill="#ffffff" />
        <polygon points="70,42 82,46 70,50" fill="#f59e0b" />
        <ellipse cx="44" cy="56" rx="16" ry="12" fill="#ea580c" />
      </svg>
    ),
  },
  {
    id: "unicorn",
    label: "Unicorn",
    icon: "🦄",
    bg: "bg-[#e0e7ff]",
    preview: (
      <svg viewBox="0 0 100 100" className="size-full">
        <circle cx="50" cy="50" r="48" fill="#e0e7ff" />
        <path d="M50 15 L56 35 L44 35 Z" fill="#fbbf24" />
        <circle cx="50" cy="52" rx="24" ry="26" fill="#ffffff" />
        <circle cx="58" cy="46" r="3.5" fill="#4338ca" />
        <circle cx="59" cy="45" r="1" fill="#ffffff" />
        <path d="M36 35 Q 28 48 34 65" stroke="#ec4899" strokeWidth="5" fill="none" strokeLinecap="round" />
        <ellipse cx="64" cy="56" rx="8" ry="6" fill="#fbcfe8" />
      </svg>
    ),
  },
  {
    id: "crane",
    label: "Crane",
    icon: "🦩",
    bg: "bg-[#dcfce7]",
    preview: (
      <svg viewBox="0 0 100 100" className="size-full">
        <circle cx="50" cy="50" r="48" fill="#dcfce7" />
        <path d="M48 30 Q 42 55 52 75" stroke="#059669" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="56" cy="30" r="12" fill="#f8fafc" />
        <polygon points="65,28 80,32 65,36" fill="#f59e0b" />
        <circle cx="58" cy="28" r="2.5" fill="#0f172a" />
      </svg>
    ),
  },
  {
    id: "owl",
    label: "Owl",
    icon: "🦉",
    bg: "bg-[#bae6fd]",
    preview: (
      <svg viewBox="0 0 100 100" className="size-full">
        <circle cx="50" cy="50" r="48" fill="#bae6fd" />
        <ellipse cx="50" cy="52" rx="26" ry="30" fill="#0284c7" />
        <circle cx="40" cy="42" r="9" fill="#ffffff" />
        <circle cx="60" cy="42" r="9" fill="#ffffff" />
        <circle cx="40" cy="42" r="4.5" fill="#0f172a" />
        <circle cx="60" cy="42" r="4.5" fill="#0f172a" />
        <polygon points="46,47 54,47 50,55" fill="#f59e0b" />
      </svg>
    ),
  },
];



export function EditProfilePage() {
  useDocumentMeta(
    "Edit Profile - EDVANZ",
    "Update your information to keep your learning journey personalized.",
  );

  const navigate = useNavigate();
  const { profile, saveProfilePreferences } = useAppState();
  const { user, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawProfileRef = useRef<any>(null);

  // Form States (mapped directly to PUT /api/users/me)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState<string>(() => {
    const regAge =
      localStorage.getItem("kidz_student_age") ||
      localStorage.getItem("edvanz_student_age");
    if (regAge) return String(regAge).trim();
    try {
      const uStr = localStorage.getItem("Edvanz_user") || localStorage.getItem("edvanz_user");
      if (uStr) {
        const u = JSON.parse(uStr);
        const a = u.age ?? u.studentAge ?? u.profile?.age;
        if (a) return String(a).trim();
      }
    } catch {}
    return "";
  });
  const [contactNo, setContactNo] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string>("bird");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [newSubjectInput, setNewSubjectInput] = useState("");

  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const countryRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false);
      }
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const availableCities = useMemo(() => {
    return country ? getCitiesByCountry(country) : [];
  }, [country]);

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return availableCities;
    return availableCities.filter((cityName) => cityName.toLowerCase().includes(q));
  }, [availableCities, citySearch]);

  const handleSelectCountry = (c: CountryCityData) => {
    setCountry(c.name);
    setCity("");
    setCountryDropdownOpen(false);
    setCountrySearch("");
    setCitySearch("");
  };

  const handleSelectCustomCountry = (customName: string) => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    setCountry(trimmed);
    setCity("");
    setCountryDropdownOpen(false);
    setCountrySearch("");
    setCitySearch("");
  };

  const handleSelectCity = (cityName: string) => {
    setCity(cityName);
    setCityDropdownOpen(false);
    setCitySearch("");
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialValues, setInitialValues] = useState<{
    fullName: string;
    age: string;
    contactNo: string;
    city: string;
    country: string;
    bio: string;
    avatar: string;
    interests: string[];
  } | null>(null);

  // 1. Fetch current profile from GET /api/users/me on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await profileService.getProfile();
        if (!isMounted || !res) return;

        const data = res.data ?? res.user ?? res;
        const p = data.profile ?? data;
        rawProfileRef.current = data;

        let loadedName = "";
        const fName = p.firstName ?? data.firstName ?? "";
        const lName = p.lastName ?? data.lastName ?? "";
        const combinedName = [fName, lName].filter(Boolean).join(" ");

        if (combinedName) {
          loadedName = combinedName;
        } else if (data.displayName || data.name) {
          loadedName = data.displayName || data.name;
        } else if (user?.displayName || user?.name) {
          loadedName = user.displayName || user.name;
        }
        if (loadedName) setFullName(loadedName);

        const mail = data.email ?? user?.email ?? "";
        if (mail) setEmail(mail);

        const storedRegAge =
          localStorage.getItem("kidz_student_age") ||
          localStorage.getItem("edvanz_student_age") ||
          (() => {
            try {
              const u = JSON.parse(localStorage.getItem("Edvanz_user") || localStorage.getItem("edvanz_user") || "{}");
              return u.age || u.studentAge || u.profile?.age || "";
            } catch {
              return "";
            }
          })();

        const backendAge =
          p.age ??
          data.age ??
          p.studentAge ??
          data.studentAge;

        const finalAge =
          backendAge !== undefined && backendAge !== null && String(backendAge).trim() !== "" && Number(backendAge) > 0
            ? String(backendAge)
            : storedRegAge
            ? String(storedRegAge)
            : "";

        if (finalAge) setAge(String(finalAge));

        const phoneVal =
          p.phoneNumber ??
          p.phone ??
          data.phoneNumber ??
          data.phone ??
          "";
        if (phoneVal) setContactNo(phoneVal);

        const cityVal = p.city ?? data.city ?? "";
        if (cityVal) setCity(cityVal);

        const countryVal = p.country ?? data.country ?? "";
        if (countryVal) setCountry(countryVal);

        const bioVal = p.bio ?? data.bio ?? "";
        if (bioVal) setBio(bioVal);

        // Only use an uploaded avatar URL if it belongs to this current user from backend
        const isValidHttpUrl = (url?: unknown): url is string =>
          typeof url === "string" && /^https?:\/\//i.test(url.trim());

        const backendAvatarUrl =
          (isValidHttpUrl(data.avatarUrl) && data.avatarUrl.trim()) ||
          (isValidHttpUrl(p.avatarUrl) && p.avatarUrl.trim()) ||
          (isValidHttpUrl(data.profilePictureUrl) && data.profilePictureUrl.trim()) ||
          (isValidHttpUrl(p.profilePictureUrl) && p.profilePictureUrl.trim()) ||
          (isValidHttpUrl(user?.avatarUrl) && user?.avatarUrl?.trim());

        const presetId =
          (typeof data.avatar === "string" && PRESET_AVATARS.some((pr) => pr.id === data.avatar))
            ? data.avatar
            : (typeof p.avatar === "string" && PRESET_AVATARS.some((pr) => pr.id === p.avatar))
            ? p.avatar
            : "bird";

        const avatarVal = backendAvatarUrl || presetId;
        setAvatar(avatarVal);

        // Map user's saved interests from backend (strictly only what the user has added)
        let loadedInterests: string[] = [];
        const rawInterests = data.interests ?? p.interests ?? [];
        if (Array.isArray(rawInterests) && rawInterests.length > 0) {
          const mapped = rawInterests
            .map((item: any) =>
              typeof item === "string" ? item : item?.interest || item?.name,
            )
            .map((s: any) => String(s || "").trim())
            .filter(Boolean);
          if (mapped.length > 0) {
            loadedInterests = Array.from(new Set(mapped));
            setSelectedInterests(loadedInterests);
          } else {
            setSelectedInterests([]);
          }
        } else {
          setSelectedInterests([]);
        }

        setInitialValues({
          fullName: loadedName,
          age: finalAge,
          contactNo: phoneVal,
          city: cityVal,
          country: countryVal,
          bio: bioVal,
          avatar: avatarVal || "bird",
          interests: loadedInterests,
        });
      } catch (err) {
        console.warn("Could not load /api/users/me profile:", err);
        // Fallback to local context values
        const fallbackName = user?.displayName || profile.name || "";
        if (isMounted) {
          if (fallbackName) {
            setFullName(fallbackName);
          }
          if (user?.email) setEmail(user.email);
        }
        setInitialValues({
          fullName: fallbackName,
          age: "",
          contactNo: "",
          city: "",
          country: "",
          bio: "",
          avatar: "bird",
          interests: [],
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [profile, user]);

  // Add subject from input (only user-added interests appear)
  const handleAddInterest = () => {
    const trimmed = newSubjectInput.trim();
    if (!trimmed) return;

    if (!selectedInterests.some((i) => i.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedInterests((prev) => [...prev, trimmed]);
    }
    setNewSubjectInput("");
  };

  // Remove interest
  const removeInterest = (name: string) => {
    setSelectedInterests((prev) =>
      prev.filter((item) => item.toLowerCase() !== name.toLowerCase())
    );
  };

  // Handle image upload from file picker
  const handleAvatarFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file should be smaller than 5MB");
      return;
    }

    // Set local preview immediately for instantaneous visual feedback
    const previewUrl = URL.createObjectURL(file);
    setAvatar(previewUrl);

    try {
      const userId = rawProfileRef.current?.id || user?.id;
      if (userId) {
        const uploaded = await profileService.uploadAvatar(userId, file);
        if (uploaded) {
          setAvatar(uploaded);
        }
      }
    } catch {
      // If presigned S3 upload endpoint is not available, convert to base64 Data URL
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Mandatory fields validation
  const trimmedFullName = fullName.trim();
  const trimmedAge = age.trim();
  const ageNum = Number(trimmedAge);
  const isAgeValid = Boolean(trimmedAge) && !isNaN(ageNum) && ageNum >= 4 && ageNum <= 18;
  const isFullNameValid = trimmedFullName.length >= 2;
  const trimmedCity = city.trim();
  const isCityValid = trimmedCity.length >= 2;
  const trimmedCountry = country.trim();
  const isCountryValid = trimmedCountry.length >= 2;
  const trimmedContact = contactNo.trim();
  const phoneValidation = trimmedContact
    ? validatePhoneNumber(trimmedContact)
    : { isValid: false, error: "Contact number is required" };
  const isPhoneValid = trimmedContact.length > 0 && phoneValidation.isValid;

  const isFormValid = Boolean(
    isFullNameValid &&
    isAgeValid &&
    isCityValid &&
    isCountryValid &&
    isPhoneValid
  );

  // Detect whether any changes have been made from initially loaded values
  const hasChanges = useMemo(() => {
    if (!initialValues) return false;

    if (fullName.trim() !== initialValues.fullName.trim()) return true;
    if (age.trim() !== initialValues.age.trim()) return true;
    if (contactNo.trim() !== initialValues.contactNo.trim()) return true;
    if (city.trim() !== initialValues.city.trim()) return true;
    if (country.trim() !== initialValues.country.trim()) return true;
    if (bio.trim() !== initialValues.bio.trim()) return true;
    if (avatar !== initialValues.avatar) return true;

    // Check interests (order-independent comparison)
    const currentSorted = [...selectedInterests].sort();
    const initSorted = [...initialValues.interests].sort();
    if (currentSorted.length !== initSorted.length) return true;
    for (let i = 0; i < currentSorted.length; i++) {
      if (currentSorted[i].toLowerCase() !== initSorted[i].toLowerCase()) {
        return true;
      }
    }

    return false;
  }, [
    initialValues,
    fullName,
    age,
    contactNo,
    city,
    country,
    bio,
    avatar,
    selectedInterests,
  ]);

  // 2. Submit form to PUT /api/users/me
  const handleSave = async () => {
    if (!trimmedFullName) {
      toast.error("Please enter your full name");
      return;
    }
    if (trimmedFullName.length < 2) {
      toast.error("Full name must be at least 2 characters long");
      return;
    }

    if (!trimmedAge) {
      toast.error("Please enter your age");
      return;
    }
    if (isNaN(ageNum) || ageNum < 4 || ageNum > 18) {
      toast.error("Age must be between 4 and 18");
      return;
    }

    if (!trimmedCity) {
      toast.error("Please enter your city");
      return;
    }
    if (trimmedCity.length < 2) {
      toast.error("City must be at least 2 characters long");
      return;
    }

    if (!trimmedCountry) {
      toast.error("Please enter your country");
      return;
    }
    if (trimmedCountry.length < 2) {
      toast.error("Country must be at least 2 characters long");
      return;
    }

    if (!trimmedContact) {
      toast.error("Please enter your contact number");
      return;
    }
    if (!isPhoneValid) {
      toast.error(phoneValidation.error || "Invalid phone number format");
      return;
    }

    setSaving(true);
    try {
      const nameParts = trimmedFullName.split(" ");
      const firstName = nameParts[0] || trimmedFullName;
      const lastName = nameParts.slice(1).join(" ") || "";

      const cleanContact = sanitizePhoneNumber(contactNo);

      // Format payload with fields from curl specification
      const existing = rawProfileRef.current || {};
      const isValidHttpUrl = (url?: unknown): url is string =>
        typeof url === "string" && /^https?:\/\//i.test(url.trim());

      const payload: Record<string, any> = {
        ...existing,
        firstName,
        lastName,
        phoneNumber: cleanContact,
        phone: cleanContact,
        bio: bio.trim(),
        country: trimmedCountry,
        city: trimmedCity,
        age: trimmedAge,
        interests: selectedInterests.map((interest) => ({ interest })),
      };

      if (isValidHttpUrl(avatar)) {
        payload.avatarUrl = avatar.trim();
        payload.avatar = avatar.trim();
      } else {
        delete payload.avatarUrl;
        delete payload.avatar;
      }

      // Strip internal identifiers and nested duplicate objects
      delete payload.id;
      delete payload.userId;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.profile;

      await profileService.updateProfile(payload);

      // Refresh application-wide profile contexts
      if (refreshProfile) {
        await refreshProfile().catch(() => {});
      }

      saveProfilePreferences(
        {
          ...profile,
          name: trimmedFullName,
          age: ageNum || 12,
          avatar,
        },
        selectedInterests,
      );

      toast.success("Profile updated successfully!");
      navigate("/kidz/profile");
    } catch (error) {
      const message = getApiError(
        error,
        "Failed to update profile. Please try again.",
      );
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Resolve current active avatar display
  const renderCurrentAvatar = () => {
    const preset = PRESET_AVATARS.find((p) => p.id === avatar);
    if (preset) {
      return preset.preview;
    }
    if (
      avatar.startsWith("http") ||
      avatar.startsWith("data:") ||
      avatar.startsWith("blob:") ||
      avatar.startsWith("/")
    ) {
      return (
        <img
          src={avatar}
          alt={fullName || "Avatar"}
          className="size-full rounded-full object-cover"
        />
      );
    }
    // Fallback default finch
    return PRESET_AVATARS[0].preview;
  };

  return (
    <div className="mx-auto max-w-6xl pb-20">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">
          YOU
        </p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">
          Edit Profile
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Update your information to keep your learning journey personalized.
        </p>
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-blue-600" />
          <span className="ml-3 text-sm font-bold text-slate-500">
            Loading your profile...
          </span>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* ─── LEFT COLUMN: Avatar & Learning Journey Card ─── */}
          <div className="space-y-6 lg:col-span-5">
            {/* Big Avatar Card */}
            <div className="flex flex-col items-center rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              {/* Circular Avatar Container */}
              <div className="relative flex size-48 items-center justify-center rounded-full border-4 border-[#ddd6fe]/60 bg-[#fce7c8]/60 p-1 shadow-inner sm:size-56">
                <div className="size-full overflow-hidden rounded-full">
                  {renderCurrentAvatar()}
                </div>

                {/* Camera upload badge */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload custom avatar"
                  aria-label="Upload custom avatar"
                  className="absolute bottom-2 right-4 z-10 flex size-10 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:bg-blue-700 active:scale-95"
                >
                  <Camera className="size-5 text-white" />
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileUpload}
              />

              {/* "Choose Avatar" Heading & Selector Row */}
              <div className="mt-6 w-full">
                <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-800">
                  Choose Avatar
                </h3>
                <div className="flex items-center gap-3">
                  {PRESET_AVATARS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAvatar(option.id)}
                      title={option.label}
                      className={cn(
                        "size-12 rounded-full border-2 p-0.5 transition-all hover:scale-105 active:scale-95",
                        avatar === option.id
                          ? "border-blue-600 ring-2 ring-blue-500 ring-offset-2"
                          : "border-slate-200 hover:border-blue-300",
                      )}
                    >
                      <div className="size-full overflow-hidden rounded-full">
                        {option.preview}
                      </div>
                    </button>
                  ))}

                  {/* Plus Button for custom photo */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload picture"
                    className="flex size-12 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-blue-500 text-blue-500 transition-colors hover:bg-blue-50 active:scale-95"
                  >
                    <Plus className="size-6 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>

            {/* "Your Learning Journey" Gradient Card */}
            <div className="flex items-center justify-between rounded-3xl border border-purple-200/90 bg-gradient-to-r from-[#ede9fe] via-[#e0e7ff] to-[#fce7c8]/50 p-6 shadow-sm">
              <div className="flex-1 pr-2">
                <div className="flex items-center gap-2 text-base font-black text-slate-900">
                  <span className="text-xl">👑</span>
                  <span>Your Learning Journey</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  Keep going! You're doing amazing!
                </p>
              </div>
              <div className="select-none text-4xl">
                ⭐
              </div>
            </div>
          </div>

          {/* ─── RIGHT COLUMN: Form Fields ─── */}
          <div className="space-y-4 lg:col-span-7">
            {/* Row 1: Full Name & Email Address */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Full Name */}
              <div className="space-y-1.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <User className="size-4 text-slate-700" />
                  <span>
                    Full Name <span className="text-red-500">*</span>
                  </span>
                </div>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Emma Watson"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/50 px-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-0"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5 rounded-2xl border border-slate-200/80 bg-white p-4 opacity-85 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <Mail className="size-4 text-slate-700" />
                  <span>Email Address</span>
                </div>
                <Input
                  value={email}
                  readOnly
                  disabled
                  placeholder="Emma.watson@gmail.com"
                  className="h-10 cursor-not-allowed rounded-xl border-slate-200 bg-slate-100/70 px-3.5 text-sm font-semibold text-slate-600"
                />
              </div>
            </div>

            {/* Row 2: Age & Contact No */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Age */}
              <div className="space-y-1.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <Calendar className="size-4 text-slate-700" />
                  <span>
                    Age <span className="text-red-500">*</span>
                  </span>
                </div>
                <Input
                  type="number"
                  min={4}
                  max={18}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="12 (Ages 4-18)"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/50 px-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-0"
                />
                {trimmedAge && !isAgeValid && (
                  <p className="text-xs font-semibold text-red-500">
                    Age must be between 4 and 18
                  </p>
                )}
              </div>

              {/* Contact No: */}
              <div className="space-y-1.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <Phone className="size-4 text-slate-700" />
                  <span>
                    Contact No <span className="text-red-500">*</span>
                  </span>
                </div>
                <Input
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value.replace(/[\s()\-]/g, ""))}
                  placeholder="+919876543210"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/50 px-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-0"
                />
                {contactNo.trim() && !isPhoneValid && (
                  <p className="text-xs font-semibold text-red-500">
                    {phoneValidation.error || "Invalid phone number format"}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Country & City */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Country */}
              <div
                ref={countryRef}
                className="relative space-y-1.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10"
              >
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <Flag className="size-4 text-slate-700" />
                  <span>
                    Country <span className="text-red-500">*</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCountryDropdownOpen((p) => !p);
                    setCityDropdownOpen(false);
                  }}
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-white"
                >
                  <span
                    className={
                      country
                        ? "text-slate-900 font-semibold truncate"
                        : "text-slate-400 font-normal"
                    }
                  >
                    {country || "Select Country"}
                  </span>
                  <ChevronDown className="size-4 text-slate-400 shrink-0 ml-1" />
                </button>

                {countryDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 flex max-h-60 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in-50 zoom-in-95">
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search country..."
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (filteredCountries.length > 0) {
                              handleSelectCountry(filteredCountries[0]);
                            } else if (countrySearch.trim()) {
                              handleSelectCustomCountry(countrySearch.trim());
                            }
                          }
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                    <div className="flex-1 space-y-0.5 overflow-y-auto max-h-48">
                      {filteredCountries.length === 0 ? (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          <p className="mb-2">No countries found{countrySearch ? ` matching "${countrySearch}"` : ""}.</p>
                          {countrySearch.trim() && (
                            <button
                              type="button"
                              onClick={() => handleSelectCustomCountry(countrySearch.trim())}
                              className="rounded-md bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                            >
                              Use "{countrySearch.trim()}"
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredCountries.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => handleSelectCountry(c)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-blue-50",
                              country === c.name
                                ? "bg-blue-50 text-blue-600"
                                : "text-slate-700",
                            )}
                          >
                            <span className="truncate">
                              {c.name} ({c.dialCode})
                            </span>
                            {country === c.name && (
                              <Check className="size-3.5 text-blue-600 shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* City */}
              <div
                ref={cityRef}
                className="relative space-y-1.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10"
              >
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <Building2 className="size-4 text-slate-700" />
                  <span>
                    City <span className="text-red-500">*</span>
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!country}
                  onClick={() => {
                    setCityDropdownOpen((p) => !p);
                    setCountryDropdownOpen(false);
                  }}
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm font-semibold transition-colors",
                    !country
                      ? "opacity-50 cursor-not-allowed text-slate-400"
                      : "hover:bg-white text-slate-800",
                  )}
                >
                  <span
                    className={
                      city
                        ? "text-slate-900 font-semibold truncate"
                        : "text-slate-400 font-normal"
                    }
                  >
                    {city ||
                      (country ? "Select City" : "Select country first")}
                  </span>
                  <ChevronDown className="size-4 text-slate-400 shrink-0 ml-1" />
                </button>

                {cityDropdownOpen && country && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 flex max-h-60 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in-50 zoom-in-95">
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search city..."
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (filteredCities.length > 0) {
                              handleSelectCity(filteredCities[0]);
                            } else if (citySearch.trim()) {
                              handleSelectCity(citySearch.trim());
                            }
                          }
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                    <div className="flex-1 space-y-0.5 overflow-y-auto max-h-48">
                      {filteredCities.length === 0 ? (
                        <div className="p-3 text-center text-xs font-medium text-slate-400">
                          <p className="mb-2">
                            No city found
                            {citySearch ? ` matching "${citySearch}"` : ""}.
                          </p>
                          {citySearch.trim() && (
                            <button
                              type="button"
                              onClick={() => handleSelectCity(citySearch.trim())}
                              className="rounded-md bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                            >
                              Use "{citySearch.trim()}"
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredCities.map((cityName) => (
                          <button
                            key={cityName}
                            type="button"
                            onClick={() => handleSelectCity(cityName)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-blue-50",
                              city === cityName
                                ? "bg-blue-50 text-blue-600"
                                : "text-slate-700",
                            )}
                          >
                            <span className="truncate">{cityName}</span>
                            {city === cityName && (
                              <Check className="size-3.5 text-blue-600 shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: Learning Interest */}
            <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <Heart className="size-4 text-slate-700" />
                  <span>
                    Learning Interest <span className="text-xs font-normal text-slate-400">(Optional)</span>
                  </span>
                </div>
                {selectedInterests.length > 0 && (
                  <span className="text-xs font-semibold text-blue-600">
                    {selectedInterests.length} selected
                  </span>
                )}
              </div>

              {/* User-Added Interest Chips */}
              {selectedInterests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedInterests.map((interestName) => (
                    <div
                      key={interestName}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/80 px-3.5 py-1.5 text-xs font-bold text-blue-800 shadow-xs animate-in fade-in-50"
                    >
                      <span>✨</span>
                      <span>{interestName}</span>
                      <button
                        type="button"
                        onClick={() => removeInterest(interestName)}
                        className="ml-1 rounded-full p-0.5 text-blue-500 hover:bg-blue-200/60 hover:text-red-600 transition-colors cursor-pointer"
                        aria-label={`Remove ${interestName}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-medium text-slate-400 py-1">
                  No learning interests added yet. Type a subject below and click Add to customize your learning journey!
                </p>
              )}

              {/* Add Subject Input */}
              <div className="flex items-center gap-2 pt-1">
                <Input
                  value={newSubjectInput}
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddInterest();
                    }
                  }}
                  placeholder="Add Subject (e.g. Science, Coding, Art)"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/50 px-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddInterest}
                  className="h-10 rounded-xl border-blue-200 px-4 font-bold text-blue-600 hover:bg-blue-50 cursor-pointer"
                >
                  <Plus className="size-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Row 5: Bio */}
            <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="text-xs font-black text-slate-900">
                Bio <span className="text-xs font-normal text-slate-400">(Optional)</span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Add Bio"
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-medium">
                {hasChanges && !isFormValid && (
                  <span className="flex items-center gap-1.5 font-semibold text-amber-600">
                    <span>*</span> Please enter all mandatory fields (Full Name, Age, City, Country) to save
                  </span>
                )}
                {hasChanges && isFormValid && (
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                    <Check className="size-3.5" /> All required fields completed
                  </span>
                )}
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => navigate("/kidz/profile")}
                  className="h-11 rounded-full border border-blue-400 px-8 py-2.5 font-bold text-blue-600 hover:bg-blue-50 active:scale-95"
                >
                  Cancel
                </Button>
                {hasChanges && (
                  <Button
                    type="button"
                    disabled={saving || !isFormValid}
                    onClick={handleSave}
                    className="h-11 rounded-full bg-blue-600 px-8 py-2.5 font-bold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const KidzEditProfile = EditProfilePage;
export default KidzEditProfile;
