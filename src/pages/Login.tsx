import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, X, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { PendingApprovalModal } from "@/components/auth/PendingApprovalModal";
import { RejectedInstructorModal } from "@/components/auth/RejectedInstructorModal";
import {
  getApiError,
  isInstructorPendingApproval,
  isInstructorRejected,
} from "@/lib/api-error";
import { cn } from "@/lib/utils";

const otpLength = 6;

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginProps {
  isModal?: boolean;
  onClose?: () => void;
  onSwitchToSignup?: () => void;
}

const maskEmail = (email: string) => {
  if (!email) return "your email";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `**@${domain}`;
  const visibleLen = Math.min(2, Math.floor(local.length / 4));
  const maskedLocal =
    local.slice(0, visibleLen) + "*".repeat(Math.max(6, local.length - visibleLen));
  return `${maskedLocal}@${domain}`;
};

const Login = ({ isModal = false, onClose, onSwitchToSignup }: LoginProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(
    Array(otpLength).fill(""),
  );
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [formError, setFormError] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [pendingApprovalOpen, setPendingApprovalOpen] = useState(false);
  const [rejectedOpen, setRejectedOpen] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const { isAuthenticated, user, loginWithToken, logout } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();

  // Detect track branding (Next vs Pro)
  const isKidzTrack = useMemo(() => {
    const sector = (searchParams.get("sector") || "").toLowerCase();
    const tab = (searchParams.get("tab") || "").toLowerCase();
    if (sector === "kids" || tab === "kids" || tab === "next") return true;
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/kidz")) {
      return true;
    }
    return true; // Default to Edvanz Next per Figma design
  }, [searchParams]);

  const brandName = isKidzTrack ? "Edvanz " : "Edvanz ";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (
      isAuthenticated &&
      user &&
      !isModal &&
      !pendingApprovalOpen &&
      !rejectedOpen
    ) {
      const redirectUrl = searchParams.get("redirect");
      if (redirectUrl) {
        navigate(redirectUrl, { replace: true });
        return;
      }
      const pending = localStorage.getItem("edvanz_pending_cart");
      if (pending && (user.role === "student" || user.role === "kids")) {
        processPendingCart(user.role);
        navigate(user.role === "kids" || user.learningSector === "KIDS" ? "/kidz/cart" : "/dashboard/cart", { replace: true });
        return;
      }
      const target =
        user.role === "admin"
          ? "/admin"
          : user.role === "instructor"
            ? "/instructor"
            : user.role === "kids" || user.learningSector === "KIDS"
              ? "/kidz"
              : "/dashboard";
      navigate(target, { replace: true });
    }
  }, [
    isAuthenticated,
    user,
    navigate,
    isModal,
    pendingApprovalOpen,
    rejectedOpen,
    searchParams,
  ]);

  const processPendingCart = (role: string): boolean => {
    if (role !== "student" && role !== "kids") return false;
    const pending = localStorage.getItem("edvanz_pending_cart");
    if (pending) {
      try {
        const item = JSON.parse(pending);
        addToCart(item);
        localStorage.removeItem("edvanz_pending_cart");
        toast({
          title: "Course added to cart!",
          description: `${item.title} was added to your cart.`,
        });
        return true;
      } catch {
        localStorage.removeItem("edvanz_pending_cart");
      }
    }
    return false;
  };

  useEffect(() => {
    if (!otpSent || resendTimer === 0) return;
    const timerId = window.setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [otpSent, resendTimer]);

  const focusOtpInput = (index: number) => {
    otpRefs.current[index]?.focus();
  };

  const resetBodyLocks = () => {
    document.body.style.pointerEvents = "";
    document.body.style.overflow = "";
    const root = document.getElementById("root");
    if (root?.getAttribute("aria-hidden") === "true") {
      root.removeAttribute("aria-hidden");
    }
  };

  const handlePendingApproval = () => {
    setPendingApprovalOpen(true);
    setFormError("");
  };

  const handleRejectedInstructor = () => {
    setRejectedOpen(true);
    setFormError("");
  };

  const resetAndLeave = () => {
    resetBodyLocks();
    setOtpSent(false);
    setOtpValues(Array(otpLength).fill(""));
    try {
      logout();
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    if (isModal && onClose) onClose();
    navigate("/", { replace: true });
  };

  const handleBackToHome = () => {
    setPendingApprovalOpen(false);
    resetAndLeave();
  };

  const handleRejectedBackToHome = () => {
    setRejectedOpen(false);
    resetAndLeave();
  };

  const handleInstructorAuthState = (error: unknown): boolean => {
    if (isInstructorPendingApproval(error)) {
      handlePendingApproval();
      return true;
    }
    if (isInstructorRejected(error)) {
      handleRejectedInstructor();
      return true;
    }
    return false;
  };

  const handleSendOtp = async (data: LoginFormData) => {
    setFormError("");
    setIsSending(true);
    try {
      await authService.login({ email: data.email });
      setEmailAddress(data.email);
      setOtpSent(true);
      setOtpValues(Array(otpLength).fill(""));
      setResendTimer(30);
      toast({ title: "OTP sent successfully to your email" });
      setTimeout(() => focusOtpInput(0), 100);
    } catch (error: unknown) {
      if (handleInstructorAuthState(error)) {
        return;
      }
      const message = getApiError(error);
      setFormError(message);
      toast({
        title: "Could not send OTP",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || !emailAddress) return;
    setFormError("");
    setIsSending(true);
    try {
      const res = await authService.resendOtp({
        email: emailAddress,
        purpose: "login",
      });
      setOtpValues(Array(otpLength).fill(""));
      setResendTimer(30);
      toast({
        title: "OTP resent",
        description: res?.message || "OTP resent successfully",
      });
      setTimeout(() => focusOtpInput(0), 100);
    } catch (error: unknown) {
      if (handleInstructorAuthState(error)) {
        return;
      }
      const message = getApiError(error);
      setFormError(message);
      toast({
        title: "Could not resend OTP",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otpValues.join("");
    if (otpCode.length < otpLength) {
      setFormError("Please enter the 6-digit OTP.");
      return;
    }

    setFormError("");
    setIsVerifying(true);
    try {
      const response = await authService.verifyLoginOtp(emailAddress, otpCode);

      const token = response?.data?.token;
      const refreshToken = response?.data?.refreshToken;
      const role = response?.data?.role;
      const email = response?.data?.email;

      if (!token || !refreshToken || !role || !email) {
        throw new Error("OTP verification failed");
      }

      localStorage.setItem("accessToken", token);
      localStorage.setItem("refreshToken", refreshToken);

      let learningSector: "IT" | "KIDS" | undefined = (response?.data as any)?.learningSector;

      if (role.toUpperCase() === "KIDS") {
        learningSector = "KIDS";
      } else if (!learningSector && (role.toUpperCase() === "STUDENT" || role.toUpperCase() === "INSTRUCTOR")) {
        try {
          const userRes = await authService.getCurrentUser();
          const authUser =
            (userRes as any)?.data?.user ??
            (userRes as any)?.data ??
            (userRes as any)?.user ??
            userRes;
          if (authUser?.learningSector) {
            learningSector = authUser.learningSector;
          } else if (authUser?.profile?.learningSector) {
            learningSector = authUser.profile.learningSector;
          }
        } catch (meError) {
          console.warn("Unable to fetch current user to resolve learningSector:", meError);
        }
      }

      loginWithToken(token, refreshToken, role, email, learningSector);
      try {
        localStorage.setItem("edvanz_has_account", "true");
      } catch {}
      const hadPendingCart = processPendingCart(role.toLowerCase());
      toast({ title: "Login successful" });

      resetBodyLocks();
      if (onClose) onClose();

      const redirectUrl = searchParams.get("redirect");
      if (redirectUrl) {
        navigate(redirectUrl, { replace: true });
        return;
      }

      if (hadPendingCart && (role.toLowerCase() === "student" || role.toLowerCase() === "kids")) {
        navigate(learningSector === "KIDS" || role.toUpperCase() === "KIDS" ? "/kidz/cart" : "/dashboard/cart", { replace: true });
        return;
      }

      switch (role.toUpperCase()) {
        case "ADMIN":
          navigate("/admin");
          break;
        case "INSTRUCTOR":
          navigate("/instructor");
          break;
        case "KIDS":
          navigate("/kidz");
          break;
        case "STUDENT":
          if (learningSector === "KIDS") {
            navigate("/kidz");
          } else {
            navigate("/dashboard");
          }
          break;
        default:
          navigate("/");
      }
    } catch (error: unknown) {
      if (handleInstructorAuthState(error)) {
        return;
      }
      const message = getApiError(error);
      setFormError(message);
      toast({
        title: "OTP verification failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    if (!otpSent) {
      await handleSendOtp(data);
      return;
    }
    await handleVerifyOtp();
  });

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");

    if (!digits) {
      const next = [...otpValues];
      next[index] = "";
      setOtpValues(next);
      return;
    }

    const next = [...otpValues];

    if (digits.length === 1) {
      next[index] = digits;
      setOtpValues(next);

      if (index < otpLength - 1) {
        focusOtpInput(index + 1);
      }
      return;
    }

    // Handles autofill/paste
    digits
      .slice(0, otpLength)
      .split("")
      .forEach((digit, i) => {
        next[i] = digit;
      });

    setOtpValues(next);
    focusOtpInput(Math.min(digits.length - 1, otpLength - 1));
  };

  const handleOtpKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
      return;
    }
    if (event.key === "Backspace") {
      if (otpValues[index]) {
        const next = [...otpValues];
        next[index] = "";
        setOtpValues(next);
      } else if (index > 0) {
        focusOtpInput(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      if (index > 0) focusOtpInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      if (index < otpLength - 1) focusOtpInput(index + 1);
      return;
    }

    const allowedKeys = ["Delete", "Tab"];
    if (!allowedKeys.includes(event.key) && !/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const digits = pastedData.replace(/\D/g, "").slice(0, otpLength);

    if (!digits) return;

    const newOtp = Array(otpLength).fill("");
    digits.split("").forEach((digit, index) => {
      newOtp[index] = digit;
    });

    setOtpValues(newOtp);
    const focusIndex = Math.min(digits.length - 1, otpLength - 1);
    setTimeout(() => focusOtpInput(focusIndex), 0);
  };

  const handleClose = () => {
    resetBodyLocks();
    if (isModal && onClose) onClose();
    else navigate("/");
  };

  const handleSignupLink = (e: React.MouseEvent) => {
    if (isModal && onSwitchToSignup) {
      e.preventDefault();
      onSwitchToSignup();
    }
  };

  const authModals = (
    <>
      <PendingApprovalModal
        open={pendingApprovalOpen}
        onOpenChange={setPendingApprovalOpen}
        onBackToHome={handleBackToHome}
      />
      <RejectedInstructorModal
        open={rejectedOpen}
        onOpenChange={setRejectedOpen}
        onBackToHome={handleRejectedBackToHome}
      />
    </>
  );

  const content = (
    <div className="relative bg-background rounded-[24px] sm:rounded-[30px] shadow-2xl border border-border/40 overflow-hidden w-full max-w-[450px] mx-auto p-7 sm:p-9 transition-all">
      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <AnimatePresence mode="wait">
        {!otpSent ? (
          /* ── Screen 1: Email entry ── */
          <motion.div
            key="screen-email"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            {/* Top Badge: Welcome back */}
            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#EEF2FF] text-[#3B82F6]">
                Welcome back
              </span>
            </div>

            {/* Title & Subtitle */}
            <h2 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight leading-tight">
              Log in to {brandName}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5 mb-6">
              Continue where your learning left off.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-foreground mb-1.5 block">
                  Email address
                </label>
                <div className="relative">
                  <Input
                    {...register("email")}
                    type="email"
                    placeholder="you@example.com"
                    disabled={isSending}
                    autoFocus
                    className="h-12 w-full rounded-xl border border-input px-4 pr-11 text-sm bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                  />
                  <Mail className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSending}
                className="w-full h-12 rounded-xl text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md shadow-blue-500/20 transition-all mt-2"
              >
                {isSending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending code...
                  </span>
                ) : (
                  "Email me a sign-in code"
                )}
              </Button>
            </form>

            <p className="text-xs sm:text-sm text-muted-foreground text-center mt-6">
              New to {brandName}?{" "}
              <Link
                to="/register"
                onClick={handleSignupLink}
                className="text-[#2563EB] font-semibold hover:underline"
              >
                Create an account
              </Link>
            </p>
          </motion.div>
        ) : (
          /* ── Screen 2: OTP verification ── */
          <motion.div
            key="screen-otp"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            {/* Top Navigation Row */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setFormError("");
                }}
                className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Change email
              </button>

              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#EEF2FF] text-[#3B82F6]">
                Email verification
              </span>
            </div>

            {/* Email Icon in Soft Rounded Square */}
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-muted flex items-center justify-center text-slate-700 dark:text-foreground mt-1 mb-3">
              <Mail className="w-5 h-5" />
            </div>

            {/* Title & Subtitle */}
            <h2 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight leading-tight">
              Enter your sign-in code
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 mb-5 leading-relaxed">
              Enter the 6-digit code sent to{" "}
              <strong className="text-foreground font-semibold">
                {maskEmail(emailAddress)}
              </strong>{" "}
              to continue to {brandName}.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              {/* 6-digit OTP Box */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
                  6-digit email code
                </label>
                <div
                  className="h-14 w-full rounded-xl border border-input bg-background flex items-center justify-center gap-2 sm:gap-3.5 px-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all cursor-text"
                  onClick={() => {
                    const firstEmpty = otpValues.findIndex((v) => !v);
                    focusOtpInput(firstEmpty !== -1 ? firstEmpty : otpLength - 1);
                  }}
                >
                  {otpValues.map((value, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      aria-label={`Digit ${index + 1}`}
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={value}
                      placeholder="0"
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      onFocus={(e) => e.target.select()}
                      className={cn(
                        "w-8 sm:w-9 h-10 text-center text-lg sm:text-xl font-bold bg-transparent outline-none transition-colors border-b-2",
                        value
                          ? "text-foreground border-transparent"
                          : "text-muted-foreground/35 border-transparent focus:border-primary",
                      )}
                    />
                  ))}
                </div>

                {/* Resend status text */}
                <p className="text-xs text-muted-foreground mt-2">
                  {resendTimer > 0 ? (
                    <>A new code can be requested in {resendTimer}s.</>
                  ) : (
                    <>
                      Didn't get the code?{" "}
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isSending}
                        className="text-[#2563EB] font-semibold hover:underline"
                      >
                        Resend code
                      </button>
                    </>
                  )}
                </p>
              </div>

              {/* Verify & sign in Button */}
              <Button
                type="submit"
                disabled={isVerifying || otpValues.join("").length < otpLength}
                className="w-full h-12 rounded-xl text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isVerifying ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <>
                    <span>Verify & sign in</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (isModal) {
    return (
      <>
        {content}
        {authModals}
      </>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen flex items-center justify-center p-4 bg-slate-50/50 dark:bg-background"
      >
        {content}
      </motion.div>
      {authModals}
    </>
  );
};

export default Login;
