import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, ArrowRight, BookOpen, IndianRupee, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useGiftCheckout } from "@/contexts/GiftCheckoutContext";
import { giftService } from "@/services/gift.service";
import { GiftSuccessDialog } from "@/components/gift/GiftSuccessDialog";
import piggySuccessImg from "@/assets/kidz/enrollment-success-piggy.png";

interface PaymentData {
  orderId: string;
  paymentId: string;
  orderNumber?: string;
  courses: { id: string; title: string; totalLessons?: number; duration?: string }[];
  amount: number;
  currency: string;
  paidAt: string;
  isGiftPayment?: boolean;
  recipientName?: string;
  recipientEmail?: string;
  giftMessage?: string;
}

interface PaymentSuccessProps {
  embedded?: boolean;
}

const PaymentSuccess = ({ embedded = false }: PaymentSuccessProps) => {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isKidz =
    location.pathname.startsWith("/kidz") ||
    (!location.pathname.startsWith("/dashboard") && (user?.role === "kids" || user?.learningSector === "KIDS"));
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const giftCtx = useGiftCheckout();
  const [retrying, setRetrying] = useState(false);

  const isDashboardMode = embedded || location.pathname.startsWith("/dashboard/") || isKidz;

  useEffect(() => {
    const stored = sessionStorage.getItem("edvanz_last_payment");
    if (stored) {
      setPaymentData(JSON.parse(stored));
    }
  }, []);

  // Determine if this is a gift payment — use context as primary, payment data as fallback
  const isGiftPayment =
    giftCtx.isGiftCheckout ||
    paymentData?.isGiftPayment === true;

  // Gift creation results from context (primary source)
  const giftResults = giftCtx.giftCreationResults;
  const hasFailedGifts = giftCtx.hasFailedGifts;

  // Retry failed gift creation with a single atomic request
  const handleRetryFailed = useCallback(async () => {
    if (!giftCtx.selectedCourses.length) return;

    const validation = giftCtx.validateProductIds();
    if (!validation.isValid) {
      const missingCourseNames = validation.missingCourses
        .map((c) => `"${c.title || c.courseId}"`)
        .join(", ");
      if (import.meta.env.DEV) {
        console.error(
          "[Gift Retry] Missing product_id in selected gift courses:",
          validation.missingCourses.map((c) => ({
            courseId: c.courseId,
            product_id: c.product_id,
            productId: c.productId,
            title: c.title,
          })),
        );
      }
      toast.error(
        `Unable to create gift. Product information is missing${
          missingCourseNames ? ` for: ${missingCourseNames}` : "."
        }`,
      );
      return;
    }

    setRetrying(true);

    try {
      if (import.meta.env.DEV) {
        console.log("[Gift Retry] Retrying createGift payload:", {
          productIds: validation.productIds,
          selectedCourses: giftCtx.selectedCourses.map((c) => ({
            courseId: c.courseId,
            product_id: c.product_id,
            productId: c.productId,
            title: c.title,
          })),
          recipientName: giftCtx.recipientName,
          recipientEmail: giftCtx.recipientEmail,
          recipientPhone: giftCtx.recipientPhone,
          giftMessage: giftCtx.giftMessage,
        });
      }

      const giftResponse = await giftService.createGift({
        productIds: validation.productIds,
        recipientName: giftCtx.recipientName,
        recipientEmail: giftCtx.recipientEmail,
        recipientPhone: giftCtx.recipientPhone,
        giftMessage: giftCtx.giftMessage,
      });

      // All courses succeeded as a single atomic request
      giftCtx.setGiftCreationResults(
        giftCtx.selectedCourses.map((c) => ({
          courseId: c.courseId,
          courseTitle: c.title,
          status: "success" as const,
          giftId: giftResponse.giftId,
        })),
      );

      toast.success("Gifts created successfully!");
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Retry failed. Please try again or contact support.";
      toast.error(errorMsg);
    } finally {
      setRetrying(false);
    }
  }, [giftCtx]);

  // Clean up gift state when navigating away (only if all succeeded)
  const handleViewOrderHistory = useCallback(() => {
    if (!hasFailedGifts) {
      giftCtx.resetGiftState();
    }
    navigate("/dashboard/orders");
  }, [hasFailedGifts, giftCtx, navigate]);

  const handleBackToDashboard = useCallback(() => {
    if (!hasFailedGifts) {
      giftCtx.resetGiftState();
    }
    navigate("/dashboard");
  }, [hasFailedGifts, giftCtx, navigate]);

  const copyPaymentId = () => {
    navigator.clipboard.writeText(paymentId || "");
    toast.success("Payment ID copied!");
  };

  // ============= GIFT PAYMENT SUCCESS =============
  if (isGiftPayment) {
    const giftContent = (
      <div className={isDashboardMode ? "py-6 px-2 md:px-6 max-w-3xl mx-auto" : "container py-16"}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl"
        >
          <GiftSuccessDialog
            recipientName={
              giftCtx.recipientName || paymentData?.recipientName || "Recipient"
            }
            recipientEmail={
              giftCtx.recipientEmail || paymentData?.recipientEmail || ""
            }
            giftMessage={
              giftCtx.giftMessage || paymentData?.giftMessage || ""
            }
            results={giftResults}
            hasFailures={hasFailedGifts}
            onRetryFailed={handleRetryFailed}
            retrying={retrying}
            onViewOrderHistory={handleViewOrderHistory}
            onBackToDashboard={handleBackToDashboard}
          />

          {/* Payment details card */}
          {paymentData && (
            <Card className="mt-6 text-left rounded-2xl border border-border/60 shadow-sm">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Payment ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{paymentId}</span>
                    <button onClick={copyPaymentId} className="text-muted-foreground hover:text-foreground">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-bold flex items-center gap-0.5">
                    <IndianRupee className="h-3.5 w-3.5" />
                    {paymentData.amount?.toLocaleString("en-IN") || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="flex items-center gap-1 font-medium text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" /> Payment Confirmed
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    );

    if (isDashboardMode) {
      return giftContent;
    }
    return {giftContent}
  }

  // ============= KIDS ENROLLMENT SUCCESS =============
  if (isKidz) {
    const firstCourse = paymentData?.courses?.[0];
    const courseTitle = firstCourse?.title || "Algebra Arcade: Equations Unlocked";
    const lessonsCount = firstCourse?.totalLessons || 21;
    const firstCourseId = firstCourse?.id;

    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pb-20 pt-2 sm:px-6">
        {/* Top Header Navigation */}
        <div>
          <button
            type="button"
            onClick={() =>
              navigate(
                firstCourseId
                  ? `/kidz/courses/${firstCourseId}`
                  : "/kidz/explore",
              )
            }
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-600 hover:underline"
          >
            BACK TO COURSE
          </button>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Enroll in Course
          </h1>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border border-slate-100/90 bg-white shadow-sm overflow-hidden">
          {/* Top Piggy Bank Banner Illustration */}
          <div className="w-full bg-[#e2eaff]/90 overflow-hidden flex items-center justify-center">
            <img
              src={piggySuccessImg}
              alt="Enrollment Successfull"
              className="w-full h-auto max-h-64 object-cover"
            />
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8 text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Enrollment Successfull!
            </h2>

            <p className="text-xs sm:text-sm font-medium text-slate-500">
              You now have access to
            </p>

            <p className="text-base sm:text-lg font-black text-slate-900">
              {courseTitle}
            </p>

            {/* Mint Green Inclusions Box */}
            <div className="mx-auto max-w-sm rounded-2xl bg-[#ecfdf5] border border-[#d1fae5] py-4 px-6 text-center space-y-1.5 text-xs sm:text-sm font-semibold text-slate-800">
              <p>{lessonsCount} Lessons</p>
              <p>Lifetime Access</p>
              <p>Certificate of Completion</p>
            </div>

            {/* Action Buttons */}
            <div className="pt-4">
              <Button
                type="button"
                onClick={() =>
                  navigate(
                    firstCourseId
                      ? `/kidz/courses/${firstCourseId}/learn`
                      : "/kidz/my-learning",
                  )
                }
                className="w-full max-w-md mx-auto flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 h-12 sm:h-14 text-sm sm:text-base font-bold text-white shadow-md active:scale-[0.99] transition-all"
              >
                Start Learning Now
              </Button>
            </div>

            <div>
              <button
                type="button"
                onClick={() => navigate("/kidz/my-learning")}
                className="text-xs sm:text-sm font-bold text-blue-600 hover:underline inline-block mt-2"
              >
                Go Back to Learning
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============= NORMAL PAYMENT SUCCESS =============
  const normalContent = (
    <div className={isDashboardMode ? "py-6 px-2 md:px-6 max-w-3xl mx-auto" : "container py-16"}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100"
        >
          <CheckCircle className="h-14 w-14 text-green-600" />
        </motion.div>

        <h1 className="text-3xl font-bold">Payment Successful! 🎉</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Congratulations! Your courses have been unlocked. Start learning now.
        </p>

        <Card className="mt-8 text-left rounded-2xl border border-border/60 shadow-sm">
          <CardContent className="p-6 space-y-4">
            {/* Payment ID */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <span className="text-muted-foreground text-sm">Payment ID</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{paymentId}</span>
                <button onClick={copyPaymentId} className="text-muted-foreground hover:text-foreground">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Order ID */}
            {paymentData?.orderId && (
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-muted-foreground text-sm">Order ID</span>
                <span className="font-mono text-sm font-medium">{paymentData.orderId}</span>
              </div>
            )}

            {/* Courses */}
            {paymentData?.courses && paymentData.courses.length > 0 && (
              <div className="border-b border-border pb-4">
                <span className="text-muted-foreground text-sm block mb-2">Courses Purchased</span>
                <ul className="space-y-1">
                  {paymentData.courses.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      {c.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Amount */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <span className="text-muted-foreground text-sm">Amount Paid</span>
              <span className="font-bold text-lg flex items-center gap-0.5">
                <IndianRupee className="h-4 w-4" />
                {paymentData?.amount?.toLocaleString("en-IN") || "—"}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Status</span>
              <span className="flex items-center gap-2 font-medium text-green-600">
                <CheckCircle className="h-4 w-4" />
                Confirmed
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" variant="gradient">
            <Link to={isKidz ? "/kidz/my-learning" : "/dashboard/courses"}>
              <BookOpen className="mr-2 h-4 w-4" />
              Start Learning
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to={isKidz ? "/kidz/explore" : "/courses"}>
              Browse More Courses
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          A confirmation email has been sent to your registered email address.
        </p>
      </motion.div>
    </div>
  );

  if (isDashboardMode) {
    return normalContent;
  }

  return {normalContent};
};

export default PaymentSuccess;
