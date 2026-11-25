import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { countries, getCitiesByCountry, getCountryByNameOrCode } from "@/data/countriesCities";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/auth.service";
import {
  X,
  ChevronDown,
  Search,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Smile,
  Palette,
  Code,
  Award,
  Users,
  CheckCircle2,
  GraduationCap,
  Trophy,
  Briefcase,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUploadButton } from "@/components/auth/FileUploadButton";
import { usePresignedUpload } from "@/hooks/usePresignedUpload";
import { useReferralCode } from "@/hooks/useReferralCode";
import { referService } from "@/services/refer.service";
import { getApiError, isEmailAlreadyRegistered } from "@/lib/api-error";
import { setLearningSector } from "@/lib/api-client";
import { PendingApprovalModal } from "@/components/auth/PendingApprovalModal";
import { LegalModal, type LegalModalType } from "@/components/auth/LegalModal";
import { countries as phoneCountries, CountryFlag } from "@/components/ui/phone-input";
import { validatePhoneNumber, sanitizePhoneNumber } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import edvanzNextImg from "@/assets/kidz/edvanz next.png";
import edvanzProImg from "@/assets/kidz/Edvanz pro.png";

export type RegistrationTab = "student" | "kids" | "instructor";
export type RegistrationExperience = "next" | "pro" | "instructor";
export type RegistrationStep = "choose" | "form";

/* ── Schemas ── */
const emailSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export const getMaxPhoneDigits = (countryCode: string): number => {
  const match = phoneCountries.find((c) => c.code.toUpperCase() === countryCode.toUpperCase());
  return match?.maxDigits || 10;
};

export const getPhoneDialCode = (countryCode: string): string => {
  const match = phoneCountries.find((c) => c.code.toUpperCase() === countryCode.toUpperCase());
  return match?.dialCode || "+91";
};

export const createRegistrationDetailsSchema = (
  exp: RegistrationExperience,
  phoneCountryCode: string = "IN"
) => {
  const maxDigits = getMaxPhoneDigits(phoneCountryCode);
  const defaultDial = getPhoneDialCode(phoneCountryCode);

  return z
    .object({
      firstName: z
        .string()
        .trim()
        .min(2, "First name must contain at least 2 characters.")
        .max(30, "First name cannot exceed 30 characters.")
        .regex(/^[A-Za-z ]+$/, "Only alphabets are allowed in first name."),
      lastName: z
        .string()
        .trim()
        .min(2, "Last name must contain at least 2 characters.")
        .max(30, "Last name cannot exceed 30 characters.")
        .regex(/^[A-Za-z ]+$/, "Only alphabets are allowed in last name."),
      email: z.string().trim().email("Please enter a valid email address."),
      country: z
        .string()
        .trim()
        .min(1, "Country is required.")
        .max(100, "Country cannot exceed 100 characters."),
      city: z
        .string()
        .trim()
        .min(1, "City is required.")
        .max(100, "City cannot exceed 100 characters."),
      phone: z.string().trim().min(1, "Phone number is required."),
      age: z.string().trim().optional(),
    })
    .superRefine((data, ctx) => {
      // Mandatory phone field
      const rawPhone = (data.phone || "").trim();
      if (!rawPhone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Phone number is required.",
          path: ["phone"],
        });
      } else {
        const candidate = rawPhone.startsWith("+") ? rawPhone : `${defaultDial}${rawPhone}`;
        const val = validatePhoneNumber(candidate);
        if (!val.isValid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: val.error || "Invalid phone number format.",
            path: ["phone"],
          });
        } else if (!rawPhone.startsWith("+")) {
          const cleanLocal = rawPhone.replace(/\D/g, "");
          const isKnownCountry = phoneCountries.some((c) => c.code.toUpperCase() === phoneCountryCode.toUpperCase());
          if (isKnownCountry && cleanLocal.length !== maxDigits) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                phoneCountryCode === "IN"
                  ? "Phone number must be exactly 10 digits for India."
                  : `Phone number must be exactly ${maxDigits} digits for ${phoneCountryCode}.`,
              path: ["phone"],
            });
          }
        }
      }

      // Age validation for Edvanz Next: Max 15 years
      if (exp === "next") {
        const ageStr = (data.age || "").trim();
        if (!ageStr) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Student age is required for Edvanz Next.",
            path: ["age"],
          });
          return;
        }
        const ageNum = parseInt(ageStr, 10);
        if (isNaN(ageNum) || ageNum < 4) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Student age must be at least 4 years.",
            path: ["age"],
          });
          return;
        }
        if (ageNum > 19) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Student age must be 19 or less.",
            path: ["age"],
          });
        }
      }
    });
};

export type EmailFormData = z.infer<typeof emailSchema>;
export type RegistrationDetailsFormData = {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  city: string;
  phone: string;
  age?: string;
};

export interface CountryData {
  name: string;
  isoCode: string;
  flag?: string;
  phonecode: string;
}


const stepVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -15 },
};

/* ── OTP Input Component ── */
interface OTPInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  disabled?: boolean;
}

const OTPInput = ({
  length,
  value,
  onChange,
  onEnter,
  disabled = false,
}: OTPInputProps) => {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const digits = useMemo(() => {
    const chars = value.split("").slice(0, length);
    return Array.from({ length }, (_, i) => chars[i] ?? "");
  }, [value, length]);

  const focusIndex = useCallback(
    (index: number) => {
      const el = inputsRef.current[index];
      if (el) {
        el.focus();
        el.select();
      }
    },
    [],
  );

  const handleChange = (index: number, char: string) => {
    const clean = char.replace(/\D/g, "");
    if (!clean) {
      const next = digits.slice();
      next[index] = "";
      onChangeRef.current(next.join(""));
      return;
    }
    const charToInsert = clean.slice(-1);
    const next = digits.slice();
    next[index] = charToInsert;
    const combined = next.join("");
    onChangeRef.current(combined);

    if (index < length - 1) {
      focusIndex(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        focusIndex(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusIndex(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      focusIndex(index + 1);
    } else if (e.key === "Enter" && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) return;

    const next = digits.slice();
    for (let i = 0; i < pasted.length && index + i < length; i++) {
      next[index + i] = pasted[i];
    }
    onChangeRef.current(next.join(""));
    const nextFocus = Math.min(index + pasted.length, length - 1);
    focusIndex(nextFocus);
  };

  return (
    <div className="flex gap-2 sm:gap-3 justify-between w-full">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          value={digit}
          disabled={disabled}
          type="text"
          inputMode="numeric"
          aria-label={`Digit ${index + 1}`}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={(e) => e.currentTarget.select()}
          placeholder="0"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl text-center text-base sm:text-lg font-bold border border-input bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
        />
      ))}
    </div>
  );
};

/* ── Main Component ── */
interface SignupProps {
  isModal?: boolean;
  onClose?: () => void;
  onSwitchToLogin?: () => void;
}

const Signup = ({ isModal = false, onClose, onSwitchToLogin }: SignupProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { loginWithToken } = useAuth();
  const { addToCart } = useCart();

  // Detect initial experience from URL params (?sector=kids, ?role=instructor, or path)
  const initialExperience: RegistrationExperience = useMemo(() => {
    const sectorParam = (searchParams.get("sector") || "").toLowerCase();
    const roleParam = (searchParams.get("role") || "").toLowerCase();
    const tabParam = (searchParams.get("tab") || "").toLowerCase();

    if (sectorParam === "kids" || roleParam === "kids" || tabParam === "kids") {
      return "next";
    }
    if (roleParam === "instructor" || tabParam === "instructor") {
      return "instructor";
    }
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/kidz")) {
      return "next";
    }
    if (sectorParam === "it" || tabParam === "pro" || tabParam === "student") {
      return "pro";
    }
    return "next";
  }, [searchParams]);

  // Initial step: if explicit params given, open form immediately, otherwise show choice screen (Screenshot 1)
  const [step, setStep] = useState<RegistrationStep>(() => {
    const sectorParam = searchParams.get("sector");
    const roleParam = searchParams.get("role");
    const tabParam = searchParams.get("tab");
    if (sectorParam || roleParam || tabParam) {
      return "form";
    }
    return "choose";
  });

  const [experience, setExperience] = useState<RegistrationExperience>(initialExperience);

  const [userEmail, setUserEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formError, setFormError] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [instructorSubmitSuccess, setInstructorSubmitSuccess] = useState(false);
  const [legalModalType, setLegalModalType] = useState<LegalModalType>(null);

  const handleOpenLegalModal = (type: "terms" | "privacy") => {
    setLegalModalType(type);
  };

  const handleAcceptLegalModal = () => {
    setAcceptTerms(true);
    setLegalModalType(null);
    toast({
      title: "Terms Accepted",
      description: "You have reviewed and accepted the terms and conditions and privacy policy.",
    });
  };

  // Static 10 countries from countriesCities dataset (iOS-friendly, zero external API calls)
  const allCountries: CountryData[] = useMemo(() => {
    return countries.map((c) => ({
      name: c.name,
      isoCode: c.code,
      phonecode: c.dialCode,
    }));
  }, []);

  // Country & City Dropdown States
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [visibleCountryCount, setVisibleCountryCount] = useState(100);

  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [visibleCityCount, setVisibleCityCount] = useState(100);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("");

  // Phone Country Code State
  const [phoneDialCode, setPhoneDialCode] = useState("+91");
  const [phoneCountryCode, setPhoneCountryCode] = useState("IN");
  const [phoneDropdownOpen, setPhoneDropdownOpen] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [instructorSector, setInstructorSector] = useState<"IT" | "KIDS">("IT");

  const countryRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  const isMountedRef = useRef(true);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false);
      }
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false);
      }
      if (phoneRef.current && !phoneRef.current.contains(e.target as Node)) {
        setPhoneDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Presigned uploads for Instructor (PDF CV + MP4 Intro Video)
  const resumeUpload = usePresignedUpload({
    uploadType: "RESUME",
    contentType: "application/pdf",
    acceptedMimeTypes: ["application/pdf"],
    acceptedExtensions: [".pdf"],
    maxSizeBytes: 10 * 1024 * 1024,
    invalidTypeMessage: "Only PDF files are allowed for the CV.",
    maxSizeMessage: "CV must be smaller than 10MB.",
  });

  const introUpload = usePresignedUpload({
    uploadType: "INTRO_VIDEO",
    contentType: "video/mp4",
    acceptedMimeTypes: ["video/mp4"],
    acceptedExtensions: [".mp4"],
    maxSizeBytes: 200 * 1024 * 1024,
    invalidTypeMessage: "Only MP4 videos are allowed for the intro video.",
    maxSizeMessage: "Intro video must be smaller than 200MB.",
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    mode: "onChange",
    defaultValues: { email: "" },
  });

  const currentMaxPhoneDigits = useMemo(() => {
    return getMaxPhoneDigits(phoneCountryCode);
  }, [phoneCountryCode]);

  const activeDetailsSchema = useMemo(
    () => createRegistrationDetailsSchema(experience, phoneCountryCode),
    [experience, phoneCountryCode]
  );

  const detailsForm = useForm<RegistrationDetailsFormData>({
    resolver: zodResolver(activeDetailsSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      country: "",
      city: "",
      phone: "",
      age: "",
    },
  });

  // Sync selectedCountryCode if country field was prefilled
  useEffect(() => {
    const curCountry = detailsForm.getValues("country");
    if (curCountry && !selectedCountryCode) {
      const match = getCountryByNameOrCode(curCountry);
      if (match) setSelectedCountryCode(match.code);
    }
  }, [detailsForm, selectedCountryCode]);

  // Clear errors when experience mode switches
  useEffect(() => {
    detailsForm.clearErrors();
  }, [experience, detailsForm]);

  const {
    code: referralCode,
    valid: referralValid,
  } = useReferralCode();

  // Filtered countries
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return allCountries;
    const q = countrySearch.toLowerCase().trim();
    return allCountries.filter((c) => c.name.toLowerCase().includes(q));
  }, [allCountries, countrySearch]);

  const displayedCountries = useMemo(() => {
    return filteredCountries.slice(0, visibleCountryCount);
  }, [filteredCountries, visibleCountryCount]);

  const handleCountryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      setVisibleCountryCount((prev) => Math.min(prev + 50, filteredCountries.length));
    }
  };

  // Cities for the selected country from static dataset
  const uniqueCities = useMemo(() => {
    if (!selectedCountryCode) return [];
    return getCitiesByCountry(selectedCountryCode);
  }, [selectedCountryCode]);

  // City Search: ONLY relevant matching cities
  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return uniqueCities;
    return uniqueCities.filter((city) => city.toLowerCase().includes(q));
  }, [uniqueCities, citySearch]);

  // Progressive scroll loading so users can scroll through the complete list of cities
  const displayedCities = useMemo(() => {
    return filteredCities.slice(0, visibleCityCount);
  }, [filteredCities, visibleCityCount]);

  const handleCityScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 150) {
      setVisibleCityCount((prev) => Math.min(prev + 100, filteredCities.length));
    }
  };

  const handleSelectCountry = (c: CountryData) => {
    setFormError("");
    detailsForm.clearErrors("country");
    detailsForm.setValue("country", c.name, { shouldValidate: true });
    detailsForm.setValue("city", "", { shouldValidate: true });
    setSelectedCountryCode(c.isoCode);
    setCountryDropdownOpen(false);
    setCountrySearch("");
    setCitySearch("");
    setVisibleCityCount(100);

    const newCountryCode = c.isoCode ? c.isoCode.toUpperCase() : "IN";
    if (c.phonecode) {
      setPhoneDialCode(c.phonecode);
    }
    setPhoneCountryCode(newCountryCode);

    // Auto-trim phone if it exceeds the new country's maxDigits
    const newMax = getMaxPhoneDigits(newCountryCode);
    const curPhone = detailsForm.getValues("phone") || "";
    const cleanCur = curPhone.replace(/\D/g, "");
    if (cleanCur.length > newMax) {
      detailsForm.setValue("phone", cleanCur.slice(0, newMax), { shouldValidate: true });
    }

    toast({
      title: "Country Selected",
      description: `${c.name} selected. Phone dial code set to ${c.phonecode || "+91"} (Max ${newMax} digits).`,
    });
  };

  const handleSelectCustomCountry = (customName: string) => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    setFormError("");
    detailsForm.clearErrors("country");
    detailsForm.setValue("country", trimmed, { shouldValidate: true });
    detailsForm.setValue("city", "", { shouldValidate: true });

    const match = getCountryByNameOrCode(trimmed);
    const phoneMatch = phoneCountries.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase() || p.code.toLowerCase() === trimmed.toLowerCase()
    );
    const code = match ? match.code : phoneMatch ? phoneMatch.code : trimmed.slice(0, 2).toUpperCase() || "OTHER";
    setSelectedCountryCode(code);

    if (match?.dialCode) {
      setPhoneDialCode(match.dialCode);
      setPhoneCountryCode(code);
    } else if (phoneMatch?.dialCode) {
      setPhoneDialCode(phoneMatch.dialCode);
      setPhoneCountryCode(phoneMatch.code);
    }

    setCountryDropdownOpen(false);
    setCountrySearch("");
    setCitySearch("");
    setVisibleCityCount(100);

    toast({
      title: "Country Selected",
      description: `${trimmed} selected as your country.`,
    });
  };

  const handleSelectPhoneCountry = (c: CountryData) => {
    setFormError("");
    setPhoneDialCode(c.phonecode);
    setPhoneCountryCode(c.isoCode);
    setPhoneDropdownOpen(false);
    setPhoneSearch("");

    const newMax = getMaxPhoneDigits(c.isoCode);
    const curPhone = detailsForm.getValues("phone") || "";
    const cleanCur = curPhone.replace(/\D/g, "");
    if (cleanCur.length > newMax) {
      detailsForm.setValue("phone", cleanCur.slice(0, newMax), { shouldValidate: true });
    }
  };

  // Phone dropdown country list & search
  const availablePhoneCountries = useMemo(() => {
    const list: CountryData[] = [];
    const seen = new Set<string>();
    for (const c of allCountries) {
      if (c.phonecode && !seen.has(c.isoCode)) {
        seen.add(c.isoCode);
        list.push(c);
      }
    }
    return list;
  }, [allCountries]);

  const filteredPhoneCountries = useMemo(() => {
    if (!phoneSearch.trim()) return availablePhoneCountries.slice(0, 50);
    const q = phoneSearch.trim().toLowerCase();
    return availablePhoneCountries
      .filter((c) => c.name.toLowerCase().includes(q) || c.phonecode.includes(q) || c.isoCode.toLowerCase().includes(q))
      .slice(0, 50);
  }, [availablePhoneCountries, phoneSearch]);

  const detailsValues = detailsForm.watch();

  const isFormComplete = useMemo(() => {
    return activeDetailsSchema.safeParse({
      ...detailsValues,
      email: userEmail || detailsValues.email,
    }).success;
  }, [detailsValues, userEmail, activeDetailsSchema]);

  const isUploading = resumeUpload.isBusy || introUpload.isBusy;

  // OTP resend timer countdown
  useEffect(() => {
    if (!otpSent || resendTimer <= 0) return;
    const timerId = window.setInterval(() => {
      setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [otpSent, resendTimer]);

  const sendOtp = useCallback(
    async (emailToUse?: string) => {
      const email = (emailToUse || emailForm.getValues("email") || userEmail).trim();
      if (!email) {
        setFormError("Please enter your email address.");
        return;
      }
      const validRes = emailSchema.safeParse({ email });
      if (!validRes.success) {
        setFormError("Please enter a valid email address.");
        return;
      }

      if (requestInFlightRef.current) return;
      requestInFlightRef.current = true;

      setFormError("");
      setIsLoading(true);

      try {
        const res = await authService.sendOtp({ email });
        if (!isMountedRef.current) return;

        setUserEmail(email);
        detailsForm.setValue("email", email, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setOtpCode("");
        setOtpVerified(false);
        setOtpSent(true);
        setResendTimer(30);

        toast({
          title: "OTP sent",
          description: res?.message || "OTP sent successfully to your email",
        });
      } catch (error) {
        if (!isMountedRef.current) return;
        const message = getApiError(error, "Failed to send OTP");
        setFormError(message);
        toast({
          title: "Could not send OTP",
          description: message,
          variant: "destructive",
        });
      } finally {
        requestInFlightRef.current = false;
        if (isMountedRef.current) setIsLoading(false);
      }
    },
    [detailsForm, emailForm, userEmail, toast],
  );

  const verifyOtp = useCallback(async () => {
    if (otpCode.length < 6) {
      setFormError("Please enter the 6-digit email code.");
      return;
    }
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;

    setFormError("");
    setIsLoading(true);

    try {
      const res = await authService.verifyRegistrationOtp(userEmail, otpCode);
      if (!isMountedRef.current) return;

      setOtpVerified(true);
      detailsForm.setValue("email", userEmail, {
        shouldValidate: true,
        shouldDirty: true,
      });
      toast({
        title: "Email verified",
        description: res?.message || "Email verified successfully! You can now complete your registration.",
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      const message = getApiError(error, "Invalid or expired OTP");
      setFormError(message);
      setOtpCode("");
      toast({
        title: "Verification failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      requestInFlightRef.current = false;
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [otpCode, userEmail, detailsForm, toast]);

  const handleResendOTP = useCallback(async () => {
    if (resendTimer > 0 || !userEmail || requestInFlightRef.current) return;
    requestInFlightRef.current = true;

    setFormError("");
    setIsLoading(true);

    try {
      const res = await authService.resendOtp({
        email: userEmail,
        purpose: "registration",
      });
      if (!isMountedRef.current) return;

      setOtpCode("");
      setResendTimer(30);
      toast({
        title: "OTP resent",
        description: res?.message || "A new code has been sent to your email",
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      const message = getApiError(error, "Could not resend OTP");
      setFormError(message);
      toast({
        title: "Resend failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      requestInFlightRef.current = false;
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [resendTimer, userEmail, toast]);

  // Unified Registration Submission
  const onSubmitRegistration = async (data: RegistrationDetailsFormData) => {
    if (!otpVerified) {
      setFormError("Please verify your email with the 6-digit code first.");
      toast({
        title: "Email verification required",
        description: "Please verify your email with the 6-digit code first.",
        variant: "destructive",
      });
      return;
    }
    if (!acceptTerms) {
      setFormError("Please accept the terms and conditions to proceed.");
      toast({
        title: "Terms required",
        description: "Please accept the terms and conditions to proceed.",
        variant: "destructive",
      });
      return;
    }
    if (experience === "instructor") {
      if (!resumeUpload.isComplete || !introUpload.isComplete) {
        setFormError("Please upload both your CV and an intro video.");
        toast({
          title: "Documents required",
          description: "Please upload both your CV and an intro video.",
          variant: "destructive",
        });
        return;
      }
    }

    if (experience === "next") {
      const ageNum = parseInt(data.age || "", 10);
      if (!data.age || isNaN(ageNum) || ageNum < 4 || ageNum > 19) {
        setFormError(ageNum > 19 ? "Student age must be 19 or less for Edvanz Next." : "Student age is required for Edvanz Next (4-19 years).");
        toast({
          title: "Student age required",
          description: ageNum > 19 ? "Age must be 19 or less for Edvanz Next." : "Please enter a valid student age between 4 and 19 years.",
          variant: "destructive",
        });
        return;
      }
    }

    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;

    setFormError("");
    setIsLoading(true);

    const cleanPhone = (data.phone || "").trim();
    let fullPhone: string | null = null;
    if (cleanPhone) {
      if (cleanPhone.startsWith("+")) {
        fullPhone = sanitizePhoneNumber(cleanPhone);
      } else {
        fullPhone = sanitizePhoneNumber(`${phoneDialCode}${cleanPhone}`);
      }
    }

    const securePassword = "Edvanz@2026";

    try {
      if (experience === "instructor") {
        const res = await authService.registerInstructor({
          email: userEmail,
          role: "INSTRUCTOR",
          learningSector: instructorSector,
          password: securePassword,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          country: data.country.trim(),
          city: data.city.trim(),
          phone: fullPhone || undefined,
          phoneNumber: fullPhone,
          introVideoFileKey: introUpload.fileKey,
          resumeFileKey: resumeUpload.fileKey,
        });

        if (!isMountedRef.current) return;

        const resData = (res as any)?.data ?? res;
        setLearningSector(instructorSector);
        localStorage.setItem("learningSector", instructorSector);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("Edvanz_user");
        localStorage.setItem("edvanz_has_account", "true");

        detailsForm.reset();
        resumeUpload.reset();
        introUpload.reset();
        setAcceptTerms(false);
        setInstructorSubmitSuccess(true);
      } else {
        // EDVANZ Next (Kidz) -> role: KIDS, learningSector: KIDS
        // EDVANZ Pro (Main Student) -> role: STUDENT, learningSector: IT
        const learningSector: "IT" | "KIDS" = experience === "next" ? "KIDS" : "IT";
        const targetRole = experience === "next" ? "KIDS" : "STUDENT";

        const res = await authService.registerWithDetails({
          email: userEmail,
          role: targetRole,
          learningSector,
          password: securePassword,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          country: data.country.trim(),
          city: data.city.trim(),
          phone: fullPhone || undefined,
          phoneNumber: fullPhone,
          ...(experience === "next" && data.age ? { age: Number(data.age) } : {}),
          ...(referralCode && referralValid !== false
            ? { referralCode: referralCode.trim().toUpperCase() }
            : {}),
        });

        if (!isMountedRef.current) return;

        // Persist kidz student age
        if (experience === "next" && data.age) {
          try {
            const ageStr = String(data.age).trim();
            const ageNum = Number(data.age);
            localStorage.setItem("kidz_student_age", ageStr);
            localStorage.setItem("edvanz_student_age", ageStr);

            const storedUser = localStorage.getItem("Edvanz_user");
            if (storedUser) {
              const parsed = JSON.parse(storedUser);
              parsed.age = ageNum;
              if (!parsed.profile) parsed.profile = {};
              parsed.profile.age = ageNum;
              localStorage.setItem("Edvanz_user", JSON.stringify(parsed));
            }

            const storedLowerUser = localStorage.getItem("edvanz_user");
            if (storedLowerUser) {
              const parsedLower = JSON.parse(storedLowerUser);
              parsedLower.age = ageNum;
              if (!parsedLower.profile) parsedLower.profile = {};
              parsedLower.profile.age = ageNum;
              localStorage.setItem("edvanz_user", JSON.stringify(parsedLower));
            }

            // Sync with kidzy-app-state-v1
            const storedApp = localStorage.getItem("kidzy-app-state-v1");
            const appParsed = storedApp ? JSON.parse(storedApp) : {};
            if (!appParsed.profile) appParsed.profile = {};
            appParsed.profile.age = ageNum;
            localStorage.setItem("kidzy-app-state-v1", JSON.stringify(appParsed));
          } catch {}
        }

        referService.clearStoredCode();

        try {
          localStorage.setItem("edvanz_has_account", "true");
        } catch {}

        // Check if backend returned authentication tokens
        const resData = (res as any)?.data ?? res;
        const token = resData?.token || resData?.accessToken;
        const refreshToken = resData?.refreshToken;
        const userObj = resData?.user;

        const returnedRole = userObj?.role || resData?.role || targetRole;
        const returnedEmail = userObj?.email || resData?.email || userEmail;
        const resolvedSector: "IT" | "KIDS" =
          userObj?.learningSector ||
          resData?.learningSector ||
          learningSector;

        // Immediately synchronize active learning sector in storage & api-client
        setLearningSector(resolvedSector);
        try {
          localStorage.setItem("learningSector", resolvedSector);
        } catch {}

        if (token && refreshToken) {
          localStorage.setItem("accessToken", token);
          localStorage.setItem("refreshToken", refreshToken);

          const firstName = userObj?.profile?.firstName || data.firstName.trim();
          const lastName = userObj?.profile?.lastName || data.lastName.trim();
          const fullName = [firstName, lastName].filter(Boolean).join(" ");

          loginWithToken(
            token,
            refreshToken,
            returnedRole,
            returnedEmail,
            resolvedSector,
            {
              id: userObj?.id || userEmail,
              name: fullName || userEmail.split("@")[0],
              avatar: userObj?.profile?.avatarUrl || undefined,
              learningSector: resolvedSector,
            },
          );

          // Restore pending cart item if user picked course before registering
          let hadPendingCart = false;
          const pending = localStorage.getItem("edvanz_pending_cart");
          if (pending && (returnedRole.toUpperCase() === "STUDENT" || returnedRole.toUpperCase() === "KIDS")) {
            try {
              const item = JSON.parse(pending);
              addToCart(item);
              localStorage.removeItem("edvanz_pending_cart");
              hadPendingCart = true;
            } catch {
              localStorage.removeItem("edvanz_pending_cart");
            }
          }

          toast({
            title:
              resolvedSector === "KIDS"
                ? "Welcome to EDVANZ Next! 🎉"
                : "Welcome to EDVANZ Pro! 🎉",
            description: resData?.message || "Registration successful",
          });

          if (onClose) onClose();

          const searchParamsLocal = new URLSearchParams(window.location.search);
          const redirectUrl = searchParamsLocal.get("redirect");

          if (redirectUrl) {
            navigate(redirectUrl, { replace: true });
            return;
          }

          if (hadPendingCart) {
            navigate(resolvedSector === "KIDS" ? "/kidz/cart" : "/dashboard/cart", {
              replace: true,
            });
            return;
          }

          // Role & Sector-based dashboard routing
          if (returnedRole.toUpperCase() === "KIDS" || resolvedSector === "KIDS") {
            navigate("/kidz", { replace: true });
          } else {
            navigate("/dashboard", { replace: true });
          }
          return;
        }

        // Fallback for mock or older backends not returning a token
        toast({
          title:
            experience === "next" ? "Welcome to EDVANZ Next!" : "Welcome to EDVANZ Pro!",
          description: resData?.message || "Registration successful",
        });

        if (onClose) onClose();
        navigate("/login", { replace: true });
      }
    } catch (error) {
      if (!isMountedRef.current) return;

      if (isEmailAlreadyRegistered(error)) {
        const duplicateMessage =
          "This email is already registered for this account type. Please log in with your existing account.";
        detailsForm.setError("email", {
          type: "manual",
          message: duplicateMessage,
        });
        setFormError(duplicateMessage);
        toast({
          title: "Email already registered",
          description: duplicateMessage,
          variant: "destructive",
        });
        return;
      }

      const message = getApiError(error, "Registration failed");
      setFormError(message);
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      requestInFlightRef.current = false;
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isModal && onClose) onClose();
    else navigate("/");
  };

  const handleLoginLink = (e: React.MouseEvent) => {
    if (isModal && onSwitchToLogin) {
      e.preventDefault();
      onSwitchToLogin();
    }
  };

  const handleChooseExperience = (exp: RegistrationExperience) => {
    setExperience(exp);
    setFormError("");
    setStep("form");
  };

  const handleBackToChoice = () => {
    setFormError("");
    setStep("choose");
  };

  // Primary Action Button Handler (Guides through OTP verification or submits with proper toasts)
  const handlePrimaryActionButton = () => {
    if (!otpSent) {
      const email = (emailForm.getValues("email") || userEmail).trim();
      if (!email) {
        setFormError("Please enter your email id to verify.");
        toast({
          title: "Email required",
          description: "Please enter your email address to verify.",
          variant: "destructive",
        });
        return;
      }
      const validRes = emailSchema.safeParse({ email });
      if (!validRes.success) {
        const errorMsg = validRes.error.issues[0]?.message || "Please enter a valid email address.";
        setFormError(errorMsg);
        toast({
          title: "Invalid email",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }
      void sendOtp(email);
      return;
    }

    if (!otpVerified) {
      if (otpCode.length < 6) {
        setFormError("Please enter the 6-digit email code.");
        toast({
          title: "Verification code required",
          description: "Please enter the complete 6-digit email verification code.",
          variant: "destructive",
        });
        return;
      }
      void verifyOtp();
      return;
    }

    if (!acceptTerms) {
      setFormError("Please accept the terms and conditions to proceed.");
      toast({
        title: "Terms and conditions required",
        description: "Please accept the terms and conditions to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (experience === "instructor") {
      if (!resumeUpload.isComplete || !introUpload.isComplete) {
        const msg = "Please upload both your CV (PDF) and an intro video (MP4).";
        setFormError(msg);
        toast({
          title: "Documents required",
          description: msg,
          variant: "destructive",
        });
        return;
      }
    }

    // When OTP is verified, validate and submit details form
    void detailsForm.handleSubmit(
      onSubmitRegistration,
      (errors) => {
        const entries = Object.entries(errors);
        if (entries.length > 0) {
          const [field, err] = entries[0];
          const fieldLabels: Record<string, string> = {
            firstName: "First name",
            lastName: "Last name",
            country: "Country",
            city: "City",
            phone: "Phone number",
            age: "Student age",
            email: "Email address",
          };
          const label = fieldLabels[field] || field;
          const msg = err?.message || `${label} is required and must be valid.`;
          setFormError(msg);
          toast({
            title: `Mandatory field: ${label}`,
            description: msg,
            variant: "destructive",
          });
        }
      }
    )();
  };

  const isInstructor = experience === "instructor";
  const themeAccentBg = isInstructor
    ? "bg-[#2563EB] hover:bg-[#1D4ED8]"
    : "bg-[#2563EB] hover:bg-[#1D4ED8]";

  // =========================================================================
  // SCREEN 0: "Choose your learning experience" (Screenshot 1)
  // =========================================================================
  const choiceScreen = (
    <motion.div
      key="screen-choice"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="p-6 sm:p-10 max-w-[840px] mx-auto w-full"
    >
      {/* Top Badge */}
      <div className="flex justify-center mb-3">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          ONE PLATFORM. YOUR KIND OF LEARNING.
        </div>
      </div>

      {/* Heading */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            EDVANZ
          </span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Choose your learning experience to get started.
        </p>
      </div>

      {/* Two Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Edvanz Next */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 flex flex-col justify-between hover:shadow-md transition-all hover:border-blue-300 group">
          <div>
            {/* Visual Header */}
            <div className="rounded-xl overflow-hidden min-h-[110px] w-full flex items-center justify-center bg-slate-50 border border-border/60">
              <img
                src={edvanzNextImg}
                alt="Edvanz Next"
                className="w-full h-[110px] object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Title & Badge */}
            <div className="flex items-center gap-2 mt-4">
              <h2 className="text-xl font-bold text-foreground">Edvanz Next</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                AGES 9–18
              </span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-4 leading-relaxed">
              A fun, engaging learning space built for school students.
            </p>

            {/* Badges List */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                <CheckCircle2 className="w-3 h-3 text-blue-600" /> Curriculum-aligned
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                <CheckCircle2 className="w-3 h-3 text-blue-600" /> Interactive lessons
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                <CheckCircle2 className="w-3 h-3 text-amber-600" /> Made for young learners
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground font-medium mb-4">
              For school students · Classes 5–12
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleChooseExperience("next")}
            className="w-full h-11 rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-semibold group transition-all"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {/* Card 2: Edvanz Pro */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 flex flex-col justify-between hover:shadow-md transition-all hover:border-blue-300 group">
          <div>
            {/* Visual Header */}
            <div className="rounded-xl overflow-hidden min-h-[110px] w-full flex items-center justify-center bg-slate-50 border border-border/60">
              <img
                src={edvanzProImg}
                alt="Edvanz Pro"
                className="w-full h-[110px] object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Title */}
            <div className="mt-4">
              <h2 className="text-xl font-bold text-foreground">Edvanz Pro</h2>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-4 leading-relaxed">
              Build in-demand skills with courses for every stage of your career.
            </p>

            {/* Badges List */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                <CheckCircle2 className="w-3 h-3 text-blue-600" /> Expert-led courses
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                <CheckCircle2 className="w-3 h-3 text-purple-600" /> Career-ready skills
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Certificates
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground font-medium mb-4">
              For college students & professionals
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleChooseExperience("pro")}
            className="w-full h-11 rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-semibold group transition-all"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>

      {/* Divider */}
 <div className="relative flex items-center justify-center my-6 w-full">
  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-border" />
  <span className="relative z-10 bg-background px-3 text-xs font-semibold text-muted-foreground tracking-wider">
    OR
  </span>
</div>
      {/* Bottom Card: Want to teach on Edvanz? */}
      <div className="rounded-2xl border border-amber-200/90 bg-amber-50/70 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-100/90 border border-amber-200 flex items-center justify-center text-amber-900 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm sm:text-base">
              Want to teach on Edvanz?
            </h3>
            <p className="text-xs text-muted-foreground">
              Create and share your knowledge with thousands of learners.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleChooseExperience("instructor")}
          className="rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-semibold shrink-0 w-full sm:w-auto px-6 group transition-all"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>

      {/* Footer Link */}
      <p className="text-sm text-muted-foreground text-center mt-6">
        Already have an account?{" "}
        <Link
          to="/login"
          onClick={handleLoginLink}
          className="text-[#2563EB] font-semibold hover:underline"
        >
          Log In
        </Link>
      </p>
    </motion.div>
  );

  // =========================================================================
  // SCREEN 1: Unified Single-Page Registration Form (Screenshot 2 / 3)
  // =========================================================================
  const formScreen = (
    <motion.div
      key="screen-form"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col md:flex-row w-full overflow-hidden"
    >
      {/* ── Left Hero Panel ── */}
      <div
        className={`p-6 sm:p-8 md:w-[40%] text-white flex flex-col justify-between shrink-0 relative overflow-hidden ${
          isInstructor
            ? "bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#60A5FA]"
            : experience === "next"
            ? "bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#60A5FA]"
            : "bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#3B82F6]"
        }`}
      >
        <div>
          {/* Top Logo / Icon */}
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-6 border border-white/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md border border-white/25 text-white mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            {isInstructor
              ? "Teach what you love"
              : experience === "next"
              ? "Big ideas start small"
              : "Build in-demand skills"}
          </div>

          {/* Large Title */}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
            {isInstructor
              ? "Share what you know"
              : experience === "next"
              ? "A brighter way to learn."
              : "A smarter way to grow."}
          </h2>

          <p className="text-xs sm:text-sm text-white/90 mt-2.5 leading-relaxed font-normal">
            {isInstructor
              ? "Create and share your knowledge with thousands of learners."
              : experience === "next"
              ? "A safe, joyful place for school students to discover what they can do."
              : "Build in-demand skills with courses for every stage of your career."}
          </p>
        </div>

        {/* Bottom Translucent Info Card */}
        <div className="mt-8 bg-white/15 backdrop-blur-md rounded-xl p-3.5 border border-white/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            {isInstructor ? (
              <Users className="w-4 h-4 text-white" />
            ) : experience === "next" ? (
              <Trophy className="w-4 h-4 text-white" />
            ) : (
              <Briefcase className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="text-xs">
            <div className="font-semibold text-white">
              {isInstructor
                ? "Your knowledge can go further"
                : experience === "next"
                ? "Learning made for wonder"
                : "Skills that move you forward"}
            </div>
            <div className="text-white/80 text-[11px]">
              {isInstructor
                ? "Reach learners everywhere."
                : experience === "next"
                ? "Made for classes 6–12."
                : "For college students & professionals."}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel (Single Page: Email + OTP + Details) ── */}
      <div className="flex-1 p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
        {/* Top Bar: Back & Pill */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            type="button"
            onClick={handleBackToChoice}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isInstructor
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            {isInstructor ? (
              <>
                <Users className="w-3 h-3 text-amber-700" /> Instructor registration
              </>
            ) : experience === "next" ? (
              <>🛡️ For school students · Classes 6–12</>
            ) : (
              <>🎓 For college students & professionals</>
            )}
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          {isInstructor
            ? "Teach on Edvanz"
            : experience === "next"
            ? "Join Edvanz Next"
            : "Join Edvanz Pro"}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 mb-6">
          {isInstructor
            ? "Create your instructor profile and share your expertise."
            : experience === "next"
            ? "A parent or guardian helps create your student account."
            : "Create your student account to start learning."}
        </p>

        {formError && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
            {formError}
          </div>
        )}

        {/* Form Container */}
        <div className="space-y-4">
          {/* 1. EMAIL ROW WITH INLINE VERIFY BUTTON */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Email
            </label>
            <div className="flex gap-2">
              <Input
                {...emailForm.register("email")}
                type="email"
                placeholder="Enter email id"
                disabled={otpVerified || (otpSent && !otpVerified && isLoading)}
                value={userEmail || emailForm.watch("email")}
                onChange={(e) => {
                  emailForm.setValue("email", e.target.value);
                  setUserEmail(e.target.value);
                }}
                className="h-10 rounded-lg text-sm"
              />
              {otpVerified ? (
                <div className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shrink-0">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Verified
                </div>
              ) : (
                <Button
                  type="button"
                  disabled={isLoading || otpVerified}
                  onClick={() => void sendOtp()}
                  className={`h-10 px-4 rounded-lg text-xs font-semibold text-white shrink-0 ${themeAccentBg}`}
                >
                  {isLoading && !otpSent ? "Sending..." : "Verify →"}
                </Button>
              )}
            </div>
            {emailForm.formState.errors.email && (
              <p className="text-[11px] text-destructive mt-1">
                {emailForm.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* 2. 6-DIGIT EMAIL CODE ROW (Appears ONLY after clicking Verify, remains hidden before that) */}
          <AnimatePresence>
            {otpSent && !otpVerified && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 pt-1 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    6-digit email code
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                    }}
                    className="text-[11px] text-[#2563EB] hover:underline"
                  >
                    Change email
                  </button>
                </div>

                <OTPInput
                  length={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  onEnter={() => {
                    if (!otpVerified && otpCode.length === 6) void verifyOtp();
                  }}
                  disabled={otpVerified || isLoading}
                />

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                  <span>
                    {resendTimer > 0
                      ? `Resend code in ${resendTimer}s`
                      : "Did not receive code?"}
                  </span>
                  {resendTimer === 0 && (
                    <button
                      type="button"
                      onClick={() => void handleResendOTP()}
                      disabled={isLoading}
                      className="text-primary font-semibold hover:underline"
                    >
                      Resend code
                    </button>
                  )}
                </div>

                {/* Inline Verify Button Under 6 Boxes */}
                <Button
                  type="button"
                  onClick={() => void verifyOtp()}
                  disabled={otpCode.length < 6 || isLoading}
                  className={`w-full h-10 rounded-lg text-xs font-semibold text-white mt-1 ${themeAccentBg}`}
                >
                  {isLoading ? "Verifying..." : "Verify →"}
                </Button>
              </motion.div>
            )}

            {otpVerified && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1.5 pt-1"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                Email verified successfully! Complete the details below.
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. FIRST NAME & LAST NAME (Grid 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                First name <span className="text-destructive">*</span>
              </label>
              <Input
                {...detailsForm.register("firstName")}
                placeholder="First name"
                className="h-10 rounded-lg text-sm"
              />
              {detailsForm.formState.errors.firstName && (
                <p className="text-[11px] text-destructive mt-1">
                  {detailsForm.formState.errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Last name <span className="text-destructive">*</span>
              </label>
              <Input
                {...detailsForm.register("lastName")}
                placeholder="Last name"
                className="h-10 rounded-lg text-sm"
              />
              {detailsForm.formState.errors.lastName && (
                <p className="text-[11px] text-destructive mt-1">
                  {detailsForm.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* 4. EDVANZ NEXT: STUDENT AGE & PHONE ROW */}
          {experience === "next" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Student Age */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Student Age <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min={4}
                  max={19}
                  placeholder="e.g. 10 (max 19)"
                  value={detailsForm.watch("age") || ""}
                  onChange={(e) => {
                    setFormError("");
                    const raw = e.target.value;
                    const cleanVal = raw.replace(/\D/g, "");
                    detailsForm.setValue("age", cleanVal, { shouldValidate: true });
                    if (cleanVal) {
                      const num = parseInt(cleanVal, 10);
                      if (num > 19) {
                        toast({
                          title: "Age Limit Exceeded",
                          description: "Student age must be 19 or less for Edvanz Next.",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                  className="h-10 rounded-lg text-sm"
                />
                {detailsForm.formState.errors.age && (
                  <p className="text-[11px] text-destructive mt-1">
                    {detailsForm.formState.errors.age.message}
                  </p>
                )}
              </div>

              {/* Phone Input */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Phone <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <div ref={phoneRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setPhoneDropdownOpen((p) => !p)}
                      className="h-10 px-2.5 rounded-lg border border-input bg-background flex items-center gap-1.5 text-xs hover:border-primary transition-colors shrink-0"
                    >
                      <CountryFlag code={phoneCountryCode} className="w-4 h-3 rounded-xs" />
                      <span className="font-semibold text-foreground">{phoneCountryCode}</span>
                      <span className="text-muted-foreground">{phoneDialCode}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>

                    {phoneDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 p-2 max-h-56 w-60 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95">
                        <div className="relative mb-2">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search code or country..."
                            value={phoneSearch}
                            onChange={(e) => setPhoneSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/50 rounded-md border border-input outline-none focus:border-primary"
                            autoFocus
                          />
                        </div>
                        <div className="overflow-y-auto flex-1 space-y-0.5 max-h-44">
                          {filteredPhoneCountries.map((c) => (
                            <button
                              key={`${c.isoCode}-${c.phonecode}`}
                              type="button"
                              onClick={() => handleSelectPhoneCountry(c)}
                              className={`w-full text-left px-2 py-1.5 text-xs rounded-md flex items-center justify-between hover:bg-muted transition-colors ${
                                phoneCountryCode === c.isoCode ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <CountryFlag code={c.isoCode} className="w-4 h-3 rounded-xs" />
                                <span className="truncate">{c.name}</span>
                              </div>
                              <span className="font-semibold text-muted-foreground text-[11px] shrink-0 ml-1">
                                {c.phonecode}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder={phoneCountryCode === "IN" ? "10-digit number" : `Enter ${currentMaxPhoneDigits}-digit number`}
                    maxLength={currentMaxPhoneDigits}
                    value={detailsForm.watch("phone") || ""}
                    onChange={(e) => {
                      setFormError("");
                      const raw = e.target.value;
                      const digitsOnly = raw.replace(/\D/g, "");
                      if (raw.length > currentMaxPhoneDigits) {
                        toast({
                          title: "Maximum Digits Reached",
                          description: `Phone number for ${phoneCountryCode} cannot exceed ${currentMaxPhoneDigits} digits.`,
                          variant: "destructive",
                        });
                      }
                      const finalVal = digitsOnly.slice(0, currentMaxPhoneDigits);
                      detailsForm.setValue("phone", finalVal, { shouldValidate: true });
                    }}
                    className="h-10 rounded-lg text-sm flex-1"
                  />
                </div>
                {detailsForm.formState.errors.phone && (
                  <p className="text-[11px] text-destructive mt-1">
                    {detailsForm.formState.errors.phone.message}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Phone <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <div ref={phoneRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setPhoneDropdownOpen((p) => !p)}
                    className="h-10 px-2.5 rounded-lg border border-input bg-background flex items-center gap-1.5 text-xs hover:border-primary transition-colors shrink-0"
                  >
                    <CountryFlag code={phoneCountryCode} className="w-4 h-3 rounded-xs" />
                    <span className="font-semibold text-foreground">{phoneCountryCode}</span>
                    <span className="text-muted-foreground">{phoneDialCode}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>

                  {phoneDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 p-2 max-h-56 w-60 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95">
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search code or country..."
                          value={phoneSearch}
                          onChange={(e) => setPhoneSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/50 rounded-md border border-input outline-none focus:border-primary"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 space-y-0.5 max-h-44">
                        {filteredPhoneCountries.map((c) => (
                          <button
                            key={`${c.isoCode}-${c.phonecode}`}
                            type="button"
                            onClick={() => handleSelectPhoneCountry(c)}
                            className={`w-full text-left px-2 py-1.5 text-xs rounded-md flex items-center justify-between hover:bg-muted transition-colors ${
                              phoneCountryCode === c.isoCode ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <CountryFlag code={c.isoCode} className="w-4 h-3 rounded-xs" />
                              <span className="truncate">{c.name}</span>
                            </div>
                            <span className="font-semibold text-muted-foreground text-[11px] shrink-0 ml-1">
                              {c.phonecode}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder={phoneCountryCode === "IN" ? "10-digit number" : `Enter ${currentMaxPhoneDigits}-digit number`}
                  maxLength={currentMaxPhoneDigits}
                  value={detailsForm.watch("phone") || ""}
                  onChange={(e) => {
                    setFormError("");
                    const raw = e.target.value;
                    const digitsOnly = raw.replace(/\D/g, "");
                    if (raw.length > currentMaxPhoneDigits) {
                      toast({
                        title: "Maximum Digits Reached",
                        description: `Phone number for ${phoneCountryCode} cannot exceed ${currentMaxPhoneDigits} digits.`,
                        variant: "destructive",
                      });
                    }
                    const finalVal = digitsOnly.slice(0, currentMaxPhoneDigits);
                    detailsForm.setValue("phone", finalVal, { shouldValidate: true });
                  }}
                  className="h-10 rounded-lg text-sm flex-1"
                />
              </div>
              {detailsForm.formState.errors.phone && (
                <p className="text-[11px] text-destructive mt-1">
                  {detailsForm.formState.errors.phone.message}
                </p>
              )}
            </div>
          )}
          
          {/* 5. COUNTRY & CITY (Grid 2 with Searchable & Scrollable Dropdowns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Country Dropdown */}
            <div ref={countryRef} className="relative">
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Country <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setCountryDropdownOpen((p) => !p);
                  setCityDropdownOpen(false);
                }}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background flex items-center justify-between text-sm hover:border-primary transition-colors"
              >
                <span className={detailsValues.country ? "text-foreground font-medium truncate" : "text-muted-foreground"}>
                  {detailsValues.country || "Select country"}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
              </button>

              {countryDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 p-2 max-h-60 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95">
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search country..."
                      value={countrySearch}
                      onChange={(e) => {
                        setCountrySearch(e.target.value);
                        setVisibleCountryCount(100);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (displayedCountries.length > 0) {
                            handleSelectCountry(displayedCountries[0]);
                          } else if (countrySearch.trim()) {
                            handleSelectCustomCountry(countrySearch.trim());
                          }
                        }
                      }}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/50 rounded-md border border-input outline-none focus:border-primary"
                      autoFocus
                    />
                  </div>
                  <div
                    className="overflow-y-auto flex-1 space-y-0.5 max-h-48"
                    onScroll={handleCountryScroll}
                  >
                    {displayedCountries.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        <p className="mb-2">No countries found{countrySearch ? ` matching "${countrySearch}"` : ""}.</p>
                        {countrySearch.trim() && (
                          <button
                            type="button"
                            onClick={() => handleSelectCustomCountry(countrySearch.trim())}
                            className="px-3 py-1 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors text-xs"
                          >
                            Use &quot;{countrySearch.trim()}&quot;
                          </button>
                        )}
                      </div>
                    ) : (
                      displayedCountries.map((c) => (
                        <button
                          key={c.isoCode || c.name}
                          type="button"
                          onClick={() => handleSelectCountry(c)}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md flex items-center justify-between hover:bg-muted transition-colors ${
                            detailsValues.country === c.name ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            {c.flag ? <span>{c.flag}</span> : <CountryFlag code={c.isoCode} className="w-4 h-3 rounded-xs" />}
                            <span className="truncate">{c.name}</span>
                            {c.phonecode && (
                              <span className="text-muted-foreground text-[10px]">({c.phonecode})</span>
                            )}
                          </span>
                          {detailsValues.country === c.name && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
              {detailsForm.formState.errors.country && (
                <p className="text-[11px] text-destructive mt-1">
                  {detailsForm.formState.errors.country.message}
                </p>
              )}
            </div>

            {/* City Dropdown */}
            <div ref={cityRef} className="relative">
              <label className="text-xs font-semibold text-foreground mb-1 block">
                City <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                disabled={!selectedCountryCode}
                onClick={() => {
                  setCityDropdownOpen((p) => !p);
                  setCountryDropdownOpen(false);
                }}
                className={`w-full h-10 px-3 rounded-lg border border-input bg-background flex items-center justify-between text-sm transition-colors ${
                  !selectedCountryCode ? "opacity-50 cursor-not-allowed" : "hover:border-primary"
                }`}
              >
                <span className={detailsValues.city ? "text-foreground font-medium truncate" : "text-muted-foreground"}>
                  {detailsValues.city || (selectedCountryCode ? "Select city" : "Select country first")}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
              </button>

              {cityDropdownOpen && selectedCountryCode && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 p-2 max-h-60 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95">
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search city..."
                      value={citySearch}
                      onChange={(e) => {
                        setCitySearch(e.target.value);
                        setVisibleCityCount(100);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (displayedCities.length > 0) {
                            detailsForm.setValue("city", displayedCities[0], { shouldValidate: true });
                            setFormError("");
                            detailsForm.clearErrors("city");
                            setCityDropdownOpen(false);
                            setCitySearch("");
                          } else if (citySearch.trim()) {
                            detailsForm.setValue("city", citySearch.trim(), { shouldValidate: true });
                            setFormError("");
                            detailsForm.clearErrors("city");
                            setCityDropdownOpen(false);
                            setCitySearch("");
                          }
                        }
                      }}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/50 rounded-md border border-input outline-none focus:border-primary"
                      autoFocus
                    />
                  </div>
                  <div
                    className="overflow-y-auto flex-1 space-y-0.5 max-h-48"
                    onScroll={handleCityScroll}
                  >
                    {displayedCities.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        <p className="mb-2">No city found{citySearch ? ` matching "${citySearch}"` : ""}.</p>
                        {citySearch.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              detailsForm.setValue("city", citySearch.trim(), { shouldValidate: true });
                              setFormError("");
                              detailsForm.clearErrors("city");
                              setCityDropdownOpen(false);
                              setCitySearch("");
                            }}
                            className="px-3 py-1 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors text-xs"
                          >
                            Use &quot;{citySearch.trim()}&quot;
                          </button>
                        )}
                      </div>
                    ) : (
                      displayedCities.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            detailsForm.setValue("city", city, { shouldValidate: true });
                            setFormError("");
                            detailsForm.clearErrors("city");
                            setCityDropdownOpen(false);
                            setCitySearch("");
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md flex items-center justify-between hover:bg-muted transition-colors ${
                            detailsValues.city === city ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                          }`}
                        >
                          <span className="truncate">{city}</span>
                          {detailsValues.city === city && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
              {detailsForm.formState.errors.city && (
                <p className="text-[11px] text-destructive mt-1">
                  {detailsForm.formState.errors.city.message}
                </p>
              )}
            </div>
          </div>
          
          {/* 6. INSTRUCTOR LEARNING SECTOR & UPLOADS (CV + Intro Video) */}
          {isInstructor && (
            <div className="space-y-3 pt-1">
              <div>
                <label htmlFor="instructor-learning-sector" className="text-xs font-semibold text-foreground mb-1 block">
                  Learning Sector <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select
                    id="instructor-learning-sector"
                    value={instructorSector}
                    onChange={(e) => setInstructorSector(e.target.value as "IT" | "KIDS")}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer pr-9"
                  >
                    <option value="IT">IT</option>
                    <option value="KIDS">KIDS</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FileUploadButton
                    label="Upload CV *"
                    accept="application/pdf,.pdf"
                    upload={resumeUpload}
                    variant="outline"
                    icon={<Upload className="w-4 h-4 mr-1 text-[#2563EB]" />}
                    className="w-full h-10 text-xs font-semibold rounded-lg border-blue-600 text-blue-600 hover:bg-blue-50"
                  />
                  {resumeUpload.error && (
                    <p className="text-[11px] text-destructive mt-1">
                      {resumeUpload.error}
                    </p>
                  )}
                </div>

                <div>
                  <FileUploadButton
                    label="Upload intro video *"
                    accept="video/mp4,.mp4"
                    upload={introUpload}
                    variant="solid"
                    icon={<Upload className="w-4 h-4 mr-1 text-white" />}
                    className="w-full h-10 text-xs font-semibold rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-none"
                  />
                  {introUpload.error && (
                    <p className="text-[11px] text-destructive mt-1">
                      {introUpload.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 7. TERMS CHECKBOX */}
          <div className="flex items-start gap-2.5 pt-2">
            <Checkbox
              id="terms-checkbox"
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(Boolean(checked))}
              className="mt-0.5 rounded-sm"
            />
            <div className="text-xs text-muted-foreground leading-relaxed select-none">
              {experience === "next" ? (
                <span>
                  I&apos;m the parent or legal guardian and agree to the{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenLegalModal("terms");
                    }}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8] inline cursor-pointer"
                  >
                    terms and conditions
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenLegalModal("privacy");
                    }}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8] inline cursor-pointer"
                  >
                    privacy policy
                  </button>{" "}
                  on behalf of this student. <span className="text-destructive">*</span>
                </span>
              ) : isInstructor ? (
                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenLegalModal("terms");
                    }}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8] inline cursor-pointer"
                  >
                    instructor terms and conditions
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenLegalModal("privacy");
                    }}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8] inline cursor-pointer"
                  >
                    privacy policy
                  </button>
                  . <span className="text-destructive">*</span>
                </span>
              ) : (
                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenLegalModal("terms");
                    }}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8] inline cursor-pointer"
                  >
                    terms and conditions
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenLegalModal("privacy");
                    }}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8] inline cursor-pointer"
                  >
                    privacy policy
                  </button>
                  . <span className="text-destructive">*</span>
                </span>
              )}
            </div>
          </div>

          {/* 8. MAIN ACTION BUTTON */}
          <div className="pt-2">
            <Button
              type="button"
              disabled={isLoading || isUploading}
              onClick={handlePrimaryActionButton}
              className={`w-full h-11 rounded-lg text-sm font-semibold text-white shadow-sm transition-all ${themeAccentBg}`}
            >
              {isLoading
                ? "Processing..."
                : !otpSent
                ? "Verify email →"
                : !otpVerified
                ? "Verify code & continue →"
                : isInstructor
                ? "Submit application →"
                : "Create student account →"}
            </Button>
          </div>

          {/* 9. FOOTER LINK */}
          <p className="text-xs sm:text-sm text-muted-foreground text-center pt-2">
            Already have an account?{" "}
            <Link
              to="/login"
              onClick={handleLoginLink}
              className="text-[#2563EB] font-semibold hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className={`relative bg-background rounded-3xl shadow-2xl overflow-hidden w-full mx-auto border border-border/60 ${
        step === "choose" ? "max-w-[820px]" : "max-w-[900px]"
      }`}
    >
      {/* Top Close Button (X) */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-20 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <AnimatePresence mode="wait">
        {step === "choose" ? choiceScreen : formScreen}
      </AnimatePresence>

      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
        onAccept={handleAcceptLegalModal}
      />
    </motion.div>
  );

  const handleSubmittedModalClose = useCallback(() => {
    document.body.style.pointerEvents = "";
    document.body.style.overflow = "";
    const root = document.getElementById("root");
    if (root?.getAttribute("aria-hidden") === "true") {
      root.removeAttribute("aria-hidden");
    }

    setInstructorSubmitSuccess(false);
    if (isModal && onClose) {
      onClose();
    }
    navigate("/", { replace: true });
  }, [isModal, onClose, navigate]);

  const handleGoToLoginFromSuccess = useCallback(() => {
    document.body.style.pointerEvents = "";
    document.body.style.overflow = "";
    const root = document.getElementById("root");
    if (root?.getAttribute("aria-hidden") === "true") {
      root.removeAttribute("aria-hidden");
    }

    setInstructorSubmitSuccess(false);
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      if (isModal && onClose) {
        onClose();
      }
      navigate("/login", { replace: true });
    }
  }, [onSwitchToLogin, isModal, onClose, navigate]);

  const applicationSubmittedContent = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative bg-background rounded-2xl shadow-2xl p-8 max-w-[480px] mx-auto text-center border border-border/40"
    >
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-9 h-9 text-emerald-500" aria-hidden="true" />
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
        Application Submitted Successfully
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        Thank you for registering as an Instructor. Your profile has been submitted successfully. Our team is currently reviewing your application. You will receive access as soon as your profile has been approved. Please check your email for future updates.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          type="button"
          autoFocus
          onClick={handleSubmittedModalClose}
          className="w-full sm:w-auto px-8 h-11 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold"
        >
          Back To Home
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleGoToLoginFromSuccess}
          className="w-full sm:w-auto px-8 h-11 rounded-full border-primary text-primary hover:bg-primary/10 font-semibold"
        >
          Go To Login
        </Button>
      </div>
    </motion.div>
  );

  if (instructorSubmitSuccess) {
    if (isModal) {
      return applicationSubmittedContent;
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background/50">
        {applicationSubmittedContent}
      </div>
    );
  }

  if (isModal) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-4 bg-background/50"
    >
      {content}
    </motion.div>
  );
};

export default Signup;
