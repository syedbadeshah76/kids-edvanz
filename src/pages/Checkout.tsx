import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGiftCheckout } from "@/contexts/GiftCheckoutContext";
import { useWallet } from "@/contexts/WalletContext";
import { orderService } from "@/services/order.service";
import { razorpayService } from "@/services/razorpay.service";
import { giftService } from "@/services/gift.service";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { EzCoinRedemption } from "@/components/wallet/EzCoinRedemption";
import { coursesService } from "@/services/courses.service";
import { formatPrice } from "@/lib/utils";
import {
  Lock,
  ShieldCheck,
  ShoppingBag,
  ArrowLeft,
  ChevronLeft,
  IndianRupee,
  Gift,
  BookOpen,
  Clock,
  Star,
  ChevronRight,
  Trash2,
} from "lucide-react";
import codingBracketsImg from "@/assets/kidz/coding-brackets-3d.jpg";
import algebraShapesImg from "@/assets/kidz/algebra-shapes-3d.jpg";
import storyWorkspaceImg from "@/assets/kidz/story-workspace-3d.jpg";
import { toast } from "sonner";

const CourseItemImage = ({ src, alt }: { src?: string; alt: string }) => {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return (
      <div className="h-32 sm:h-28 w-full sm:w-36 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col items-center justify-center p-2 shrink-0 text-center shadow-xs">
        <BookOpen className="h-7 w-7 mb-1 opacity-90" />
        <span className="text-[11px] font-medium leading-tight line-clamp-2 px-1">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setImgError(true)}
      className="h-32 sm:h-28 w-full sm:w-36 rounded-lg object-cover shrink-0"
    />
  );
};

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const cart = useCart();
  const giftCtx = useGiftCheckout();
  const wallet = useWallet();
  const isKidz =
    location.pathname.startsWith("/kidz") ||
    (!location.pathname.startsWith("/dashboard") && (user?.role === "kids" || user?.learningSector === "KIDS"));

  const [loading, setLoading] = useState(false);

  // Determine checkout mode
  const isGiftParam = searchParams.get("mode") === "gift";
  const isGiftMode =
    (isGiftParam || giftCtx.isGiftCheckout) &&
    giftCtx.selectedCourses.length > 0;

  // Deactivate gift mode if user entered normal checkout path
  useEffect(() => {
    if (!isGiftParam && !isGiftMode && giftCtx.isGiftCheckout) {
      giftCtx.deactivateGiftCheckout();
    }
  }, [isGiftParam, isGiftMode, giftCtx]);

  // Enriched course metadata fetched dynamically from backend
  const [enrichedDetails, setEnrichedDetails] = useState<
    Record<
      string,
      {
        thumbnail?: string;
        description?: string;
        lessons?: number;
        duration?: string;
        rating?: number;
        reviewCount?: number;
      }
    >
  >({});

  useEffect(() => {
    if (!cart.items.length) return;
    let cancelled = false;

    cart.items.forEach((item) => {
      const targetCourseId = item.courseId || item.productId || item.id;
      if (!targetCourseId) return;

      coursesService
        .getCourse(targetCourseId, item.isLive)
        .then((res: any) => {
          if (cancelled) return;
          const data = res?.data ?? res;
          if (!data || typeof data !== "object") return;

          const thumb =
            data.thumbnailUrl || data.thumbnail || data.image || item.thumbnail;
          const desc =
            data.description ||
            data.shortDescription ||
            (data.title ? `${data.title}` : "");

          const lessons =
            data.totalLessons ??
            data.lessons ??
            (data.modules && Array.isArray(data.modules)
              ? data.modules.reduce(
                  (acc: number, m: any) => acc + (m.lessons?.length || 0),
                  0,
                )
              : data.schedule?.sessionDays
                ? typeof data.schedule.sessionDays === "string"
                  ? data.schedule.sessionDays.split(",").length
                  : Array.isArray(data.schedule.sessionDays)
                    ? data.schedule.sessionDays.length
                    : undefined
                : undefined);

          const mins =
            data.totalDurationMinutes ??
            data.durationMinutes ??
            data.schedule?.sessionDurationMinutes;
          const durStr = mins
            ? `${mins} min`
            : data.duration ?? undefined;

          const rat = Number(data.rating ?? data.avgRating ?? 0);
          const revCount = Number(data.reviewCount ?? data.totalReviews ?? 0);

          setEnrichedDetails((prev) => ({
            ...prev,
            [item.id]: {
              thumbnail: thumb,
              description: desc,
              lessons: lessons,
              duration: durStr,
              rating: rat > 0 ? rat : undefined,
              reviewCount: revCount > 0 ? revCount : undefined,
            },
          }));
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, [cart.items]);

  // Display items: gift courses (gift mode) or cart items (normal mode)
  const displayItems = useMemo(() => {
    if (isGiftMode) {
      return giftCtx.selectedCourses.map((c) => ({
        courseId: c.courseId,
        title: c.title,
        thumbnail: c.thumbnail,
        description: c.description || "",
        instructor: c.instructor || "EDVANZ Instructor",
        lessons: c.lessons,
        duration: c.duration,
        rating: c.rating,
        reviewCount: undefined as number | undefined,
        price: c.originalPrice,
        discountedPrice: c.price,
        isGift: true,
      }));
    }
    return cart.items.map((i) => {
      const extra = enrichedDetails[i.id] || {};
      return {
        courseId: i.courseId || i.id,
        title: i.title,
        thumbnail: extra.thumbnail || i.thumbnail,
        description: extra.description || i.description || "",
        instructor: i.instructor || "EDVANZ Instructor",
        lessons: extra.lessons ?? i.totalLessons,
        duration: extra.duration ?? i.duration,
        rating: extra.rating ?? i.rating,
        reviewCount: extra.reviewCount ?? i.reviewCount,
        price: i.price,
        discountedPrice: i.discountedPrice,
        isGift: false,
      };
    });
  }, [isGiftMode, giftCtx.selectedCourses, cart.items, enrichedDetails]);

  // Calculate Subtotal, Taxable Amount, Tax & Final Totals
  const subtotal = useMemo(() => {
    if (isGiftMode) {
      return giftCtx.selectedCourses.reduce((sum, c) => sum + c.price, 0);
    }
    return cart.subtotal;
  }, [isGiftMode, giftCtx.selectedCourses, cart.subtotal]);

  const couponDiscount = isGiftMode ? 0 : cart.discount;
  const ezDiscountAmount = isGiftMode ? 0 : wallet.quote?.valid ? wallet.quote.discountAmount : 0;
  
  // Taxable amount = Subtotal - Coupon Discount - EZ Coins Discount
  const taxableAmount = Math.max(0, subtotal - couponDiscount - ezDiscountAmount);
  
  // Tax (18%) on taxable amount
  const taxAmount = Math.round(taxableAmount * 0.18 * 100) / 100;

  // Final Total = Taxable amount + Tax
  const totalAmount = Math.max(0, taxableAmount + taxAmount);

  // ============= Coupon/Coin Mutual Exclusivity (Checkout) =============

  // Called by EzCoinRedemption when user selects a tier — clear coupon
  const handleCouponConflictFromCoins = useCallback(() => {
    if (cart.couponCode) {
      cart.removeCoupon();
      toast.info("Coupon removed — only one discount can be used at a time");
    }
  }, [cart]);

  // ============= Quote Invalidation on Subtotal Change =============
  const prevSubtotalRef = useRef(subtotal);

  useEffect(() => {
    if (wallet.selectedTier && prevSubtotalRef.current !== subtotal) {
      wallet.clearRedemption();
    }
    prevSubtotalRef.current = subtotal;
  }, [subtotal, wallet]);

  // ============= Normal Checkout Payment Flow (Razorpay — preserved 100%) =============
  const handleNormalPay = async () => {
    if (cart.items.length === 0) return;
    setLoading(true);

    try {
      // Determine checkout payload — mutually exclusive coupon vs coins
      const coinsToRedeem = wallet.appliedCoins > 0 ? wallet.appliedCoins : null;
      const couponCode = coinsToRedeem ? "" : (cart.couponCode || cart.appliedCoupon?.code || "");
      const couponId = coinsToRedeem ? undefined : cart.appliedCoupon?.id;

      const order = await orderService.checkout({
        couponCode,
        code: couponCode,
        coupon: couponCode,
        couponId,
        coinsToRedeem,
        discountAmount: couponDiscount,
        discount: couponDiscount,
        subtotal,
        totalAmount,
        currency: cart.currency,
      });

      // Free Checkout (e.g. 100% discount coupon or full coin redemption)
      if (totalAmount <= 0) {
        sessionStorage.setItem(
          "edvanz_last_payment",
          JSON.stringify({
            orderId: order.id,
            orderNumber: order.orderNumber,
            paymentId: `free_${order.id || Date.now()}`,
            courses: cart.items.map((i) => ({
              id: i.courseId,
              title: i.title,
              totalLessons: i.totalLessons,
              duration: i.duration,
            })),
            amount: 0,
            currency: cart.currency || "USD",
            paidAt: new Date().toISOString(),
          }),
        );

        await cart.clearCart();
        wallet.clearRedemption();
        toast.success("Order placed successfully! 🎉");
        navigate(isKidz ? `/kidz/payment-success/${order.id || "free"}` : `/dashboard/payment-success/${order.id || "free"}`);
        return;
      }

      // Paid orders via Razorpay
      const init = await razorpayService.initiate(order.id, totalAmount, cart.currency);

      openRazorpayCheckout({
        keyId: init.razorpayKeyId,
        orderId: init.razorpayOrderId,
        amount: Math.round(totalAmount * 100),
        currency: init.currency || cart.currency,
        courseName:
          cart.items.length === 1
            ? cart.items[0].title
            : `${cart.items.length} Courses — EDVANZ`,
        customerName: user?.name,
        customerEmail: user?.email,
        onSuccess: async (response) => {
          try {
            // console.log("response from coming from the razp", response);
            const payment = await razorpayService.verify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId: order.id,
            });

            if (payment.status !== "CAPTURED") {
              throw new Error("Payment not captured");
            }

            sessionStorage.setItem(
              "edvanz_last_payment",
              JSON.stringify({
                orderId: order.id,
                orderNumber: order.orderNumber,
                paymentId: payment.id,
                courses: cart.items.map((i) => ({
                  id: i.courseId,
                  title: i.title,
              totalLessons: i.totalLessons,
              duration: i.duration,
                })),
                amount: payment.amount,
                currency: payment.currency,
                paidAt: payment.createdAt,
              }),
            );

            await cart.clearCart();
            wallet.clearRedemption();
            toast.success("Payment successful! 🎉");
            navigate(isKidz ? `/kidz/payment-success/${payment.id}` : `/dashboard/payment-success/${payment.id}`);
          } catch (err: any) {
            // console.log("VERIFY ERROR:", err);
            sessionStorage.setItem(
              "edvanz_payment_error",
              JSON.stringify({
                message: err.message || "Verification failed",
                code: "VERIFY_FAILED",
              }),
            );
            toast.error("Payment verification failed.");
            navigate(isKidz ? "/kidz/payment-failed" : "/dashboard/payment-failed");
          } finally {
            setLoading(false);
          }
        },
        onFailure: (error) => {
          sessionStorage.setItem(
            "edvanz_payment_error",
            JSON.stringify({
              message: error?.description || "Payment failed",
              code: error?.code,
            }),
          );
          toast.error(error?.description || "Payment failed.");
          setLoading(false);
          navigate(isKidz ? "/kidz/payment-failed" : "/dashboard/payment-failed");
        },
        onDismiss: () => {
          setLoading(false);
          toast.info("Payment cancelled");
        },
      });
    } catch (e: any) {
      toast.error(e.message || "Could not initiate payment.");
      setLoading(false);
    }
  };

  // ============= Gift Checkout Payment Flow (creates gifts ONLY after payment verification) =============
  const handleGiftPay = async () => {
    if (giftCtx.selectedCourses.length === 0) return;

    // Validate product_id for EVERY selected course — NO fallback to courseId!
    const validation = giftCtx.validateProductIds();
    if (!validation.isValid) {
      const missingCourseNames = validation.missingCourses
        .map((c) => `"${c.title || c.courseId}"`)
        .join(", ");
      if (import.meta.env.DEV) {
        console.error(
          "[Gift Checkout] Missing product_id in selected gift courses:",
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

    setLoading(true);

    try {
      const order = await orderService.checkout(cart.couponCode || "");
      giftCtx.setGiftOrderId(order.id);

      const init = await razorpayService.initiate(order.id);

      openRazorpayCheckout({
        keyId: init.razorpayKeyId,
        orderId: init.razorpayOrderId,
        amount: Math.round(totalAmount * 100),
        currency: init.currency,
        courseName:
          giftCtx.selectedCourses.length === 1
            ? `Gift: ${giftCtx.selectedCourses[0].title}`
            : `Gift: ${giftCtx.selectedCourses.length} Courses — EDVANZ`,
        customerName: user?.name,
        customerEmail: user?.email,
        onSuccess: async (response) => {
          try {
            const payment = await razorpayService.verify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId: order.id,
            });

            if (payment.status !== "CAPTURED") {
              throw new Error("Payment not captured");
            }

            // Re-validate product IDs strictly before making API call
            const currentValidation = giftCtx.validateProductIds();
            if (!currentValidation.isValid) {
              throw new Error(
                "Unable to create gift. Product information is missing.",
              );
            }

            // Defensive dev logging
            if (import.meta.env.DEV) {
              console.log("[Gift Checkout] Sending createGift payload:", {
                productIds: currentValidation.productIds,
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

            // ONLY after payment verification — create gifts on backend (single atomic request)
            const giftResponse = await giftService.createGift({
              productIds: currentValidation.productIds,
              recipientName: giftCtx.recipientName,
              recipientEmail: giftCtx.recipientEmail,
              recipientPhone: giftCtx.recipientPhone,
              giftMessage: giftCtx.giftMessage,
            });

            // Store results in context for success tracking
            giftCtx.setGiftCreationResults(
              giftCtx.selectedCourses.map((c) => ({
                courseId: c.courseId,
                courseTitle: c.title,
                status: "success" as const,
                giftId: giftResponse.giftId,
              })),
            );

            sessionStorage.setItem(
              "edvanz_last_payment",
              JSON.stringify({
                orderId: order.id,
                orderNumber: order.orderNumber,
                paymentId: payment.id,
                courses: giftCtx.selectedCourses.map((c) => ({
                  id: c.courseId,
                  title: c.title,
                })),
                amount: payment.amount,
                currency: payment.currency,
                paidAt: payment.createdAt,
                isGiftPayment: true,
                recipientName: giftCtx.recipientName,
                recipientEmail: giftCtx.recipientEmail,
                giftMessage: giftCtx.giftMessage,
              }),
            );

            await cart.clearCart();
            toast.success("Payment successful! 🎉");
            navigate(isKidz ? `/kidz/payment-success/${payment.id}` : `/dashboard/payment-success/${payment.id}`);
          } catch (err: any) {
            sessionStorage.setItem(
              "edvanz_payment_error",
              JSON.stringify({
                message: err.message || "Verification failed",
                code: "VERIFY_FAILED",
              }),
            );
            toast.error("Payment verification failed.");
            setLoading(false);
            navigate(isKidz ? "/kidz/payment-failed" : "/dashboard/payment-failed");
          }
        },
        onFailure: (error) => {
          sessionStorage.setItem(
            "edvanz_payment_error",
            JSON.stringify({
              message: error?.description || "Payment failed",
              code: error?.code,
            }),
          );
          toast.error(error?.description || "Payment failed.");
          setLoading(false);
          navigate(isKidz ? "/kidz/payment-failed" : "/dashboard/payment-failed");
        },
        onDismiss: () => {
          setLoading(false);
          toast.info("Payment cancelled");
        },
      });
    } catch (e: any) {
      toast.error(e.message || "Could not initiate payment.");
      setLoading(false);
    }
  };

  const handlePay = isGiftMode ? handleGiftPay : handleNormalPay;

  if (isKidz) {
    if (displayItems.length === 0) {
      return (
        <div className="mx-auto flex max-w-7xl flex-col gap-6 py-12 px-4">
          <div>
            <Link
              to="/kidz/explore"
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ChevronLeft className="size-4" />
              BACK TO COURSE
            </Link>
            <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl tracking-tight">
              Checkout
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Your cart is empty.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/80 py-16 px-6 text-center shadow-xs">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-xs">
              <ShoppingBag className="size-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Your Cart is Empty</h3>
            <p className="mt-2 max-w-md text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed">
              Looks like you have not added any courses to checkout yet. Explore our fun courses and find something you love!
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button
                asChild
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-5 shadow-sm"
              >
                <Link to="/kidz/explore">
                  Explore Courses 🚀
                </Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-8 pb-16 px-4">
        {/* Header */}
        <div>
          <Link
            to={isGiftMode ? "/kidz/explore" : "/kidz/cart"}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ChevronLeft className="size-4" />
            BACK TO {isGiftMode ? "COURSE" : "CART"}
          </Link>
          <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl tracking-tight">
            Checkout
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Review your order and complete secure enrollment!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Items + Student Info + Trust badge */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Items List */}
            <div className="flex flex-col gap-4">
              {displayItems.map((item, idx) => {
                const fallback = [codingBracketsImg, algebraShapesImg, storyWorkspaceImg][idx % 3];
                const thumb = item.thumbnail || fallback;
                const lessons = item.lessons ?? 12;
                const orig = item.price ?? 999;
                const disc = item.discountedPrice ?? item.price ?? 499;
                const hasDiscount = orig > disc && disc > 0;
                const discountPercent = hasDiscount
                  ? Math.round(((orig - disc) / orig) * 100)
                  : 30;
                const categoryName = (item as any).category || "Math";

                return (
                  <article
                    key={item.courseId}
                    className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                  >
                    <div
                      className="flex items-start sm:items-center gap-4 flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/kidz/courses/${item.courseId}`)}
                    >
                      <div className="size-24 sm:size-28 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-2xs">
                        <img
                          src={thumb}
                          alt={item.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = fallback;
                          }}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {item.title}
                          </h2>
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-blue-600 shrink-0">
                            {categoryName}
                          </span>
                        </div>

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Ages 6 - 10 : {lessons} Lessons : Certificate
                        </p>

                        <div className="mt-3 flex items-center gap-2.5 flex-wrap">
                          <span className="text-base sm:text-lg font-black text-slate-900">
                            ₹ {disc}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-400 line-through">
                            ₹ {orig}
                          </span>
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-rose-600">
                            {discountPercent}% off
                          </span>
                        </div>
                      </div>
                    </div>

                    {!item.isGift && (
                      <button
                        type="button"
                        onClick={() => cart.removeFromCart(item.courseId)}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors shrink-0 self-end sm:self-center"
                        aria-label="Remove item"
                      >
                        <Trash2 className="size-4 sm:size-5" />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Gift Recipient Information (if Gift Mode) */}
            {isGiftMode && (
              <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-5 shadow-xs">
                <div className="flex items-center gap-2 font-black text-purple-900 text-sm mb-3">
                  <Gift className="size-4 text-purple-600" />
                  Gift Recipient Information
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Recipient Name</span>
                    <span className="text-slate-900 font-bold">{giftCtx.recipientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Recipient Email</span>
                    <span className="text-slate-900 font-bold">{giftCtx.recipientEmail}</span>
                  </div>
                  {giftCtx.giftMessage && (
                    <div className="sm:col-span-2 pt-2 border-t border-purple-100 italic text-purple-800">
                      "{giftCtx.giftMessage}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Learner / Student Account Info Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="size-11 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                  {user?.name?.charAt(0).toUpperCase() || "S"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">
                      {user?.name || "Student Learner"}
                    </span>
                    <span className="rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                      Verified Student
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {user?.email || "Enrolling in Edvanz Kidz Academy"}
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-100">
                Kids Explorer 🚀
              </span>
            </div>

            {/* Trust & Safe Checkout Card */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-xs flex items-center gap-3.5">
              <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                  100% Safe & Secure Payment with Razorpay
                </h4>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500 mt-0.5">
                  Your transaction is protected with 256-bit SSL encryption. All courses include instant access & certificates!
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Checkout */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-7 shadow-xs">
              <h3 className="text-xl font-black text-slate-900 mb-6">Order Summary</h3>

              <div className="space-y-3.5 text-sm font-semibold">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal ({displayItems.length} {displayItems.length === 1 ? "Course" : "Courses"})</span>
                  <span className="text-slate-900 font-bold">₹ {subtotal}</span>
                </div>

                {couponDiscount > 0 && !isGiftMode && (
                  <div className="flex justify-between items-center text-emerald-600">
                    <span>Coupon Discount</span>
                    <span className="font-bold">-₹ {couponDiscount}</span>
                  </div>
                )}

                {ezDiscountAmount > 0 && !isGiftMode && (
                  <div className="flex justify-between items-center text-emerald-600">
                    <span>EZ Coins Discount</span>
                    <span className="font-bold">-₹ {ezDiscountAmount}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-slate-600">
                  <span>GST / Tax (18%)</span>
                  <span className="text-slate-900 font-bold">₹ {taxAmount}</span>
                </div>

                <div className="border-t border-slate-100 pt-4 my-2 flex justify-between items-center">
                  <span className="text-base font-black text-slate-900">Total Amount</span>
                  <span className="text-2xl font-black text-blue-600">₹  {Number(totalAmount).toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handlePay}
                disabled={loading}
                className="w-full mt-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-4 shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  "Processing Payment..."
                ) : (
                  <>
                    <Lock className="size-4" />
                <span>
  {totalAmount <= 0
    ? "Complete Enrollment (Free)"
    : `Pay ₹ ${Number(totalAmount).toFixed(2)}`}
</span>  </>
                )}
              </Button>

              <div className="mt-4 text-center">
                <span className="text-[11px] font-bold text-slate-400">
                  ⚡ Instant Lifetime Course Access & Certificate Included
                </span>
              </div>
            </div>

            {/* Enjoy More Learning, More Savings Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-[#dbeafe] to-[#f3e8ff] p-5 border border-purple-100/70 shadow-xs flex items-center gap-4">
              <div className="size-12 rounded-xl bg-white shadow-xs flex items-center justify-center text-2xl shrink-0">
                🎁
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Enjoy More Learning, More Savings!
                </h4>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Have questions about your enrollment? Our friendly student support is ready to help 24/7!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Nothing to checkout</h2>
        <p className="text-muted-foreground mt-2">
          Add some courses to your cart first.
        </p>
        <Button asChild className="mt-6">
          <Link to={isKidz ? "/kidz/explore" : "/courses"}>Browse Courses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 md:py-8">
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm text-muted-foreground flex items-center flex-wrap gap-1">
        <Link to={isKidz ? "/kidz/dashboard" : "/dashboard"} className="hover:text-foreground">
          {isKidz ? "Kidz" : "Dashboard"}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={isKidz ? "/kidz/cart" : "/dashboard/cart"} className="hover:text-foreground">
          Cart
        </Link>
        <ChevronRight className="h-3 w-3" />
        {isGiftMode ? (
          <>
            <Link to={isKidz ? "/kidz/explore" : "/dashboard/gift-course"} className="hover:text-foreground">
              Gift a Course
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Checkout</span>
          </>
        ) : (
          <span className="text-foreground font-medium">Checkout</span>
        )}
      </nav>

      {/* Header & Back Button */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={isGiftMode ? "/dashboard/gift-course" : (isKidz ? "/kidz/cart" : "/dashboard/cart")}
          className="p-2 rounded-lg border border-border/60 hover:bg-muted transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold">Checkout</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Items List Card (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center justify-between">
                <span>Items ({displayItems.length})</span>
                {isGiftMode && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Gift className="h-3.5 w-3.5" /> Gift Checkout Mode
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {displayItems.map((item) => (
                <div
                  key={item.courseId}
                  className="flex flex-col sm:flex-row gap-4 rounded-xl border border-border/60 p-4 transition-shadow hover:shadow-xs"
                >
                  <CourseItemImage src={item.thumbnail} alt={item.title} />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2">
                          {item.title}
                        </h3>
                        {item.isGift ? (
                          <Gift className="h-4 w-4 text-primary shrink-0 mt-1" />
                        ) : (
                          <button
                            onClick={() => cart.removeFromCart(item.courseId)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {item.description ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {item.lessons ? (
                          <span className="inline-flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                            {item.lessons} Lessons
                          </span>
                        ) : null}
                        {item.duration ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {item.duration}
                          </span>
                        ) : null}
                        {item.rating && item.rating > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {item.rating.toFixed(1)}
                            {item.reviewCount ? ` (${item.reviewCount})` : ""}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-primary text-base">
                          {formatPrice(item.discountedPrice || item.price, cart.currency)}
                        </span>
                        {item.discountedPrice && item.price > item.discountedPrice && (
                          <span className="ml-2 text-xs text-muted-foreground line-through">
                            {formatPrice(item.price, cart.currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Order Summary & Payment Panel (1 col) */}
        <div className="space-y-4">
          {/* Order Summary Card */}
          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg font-semibold">
                {isGiftMode ? "Gift Summary" : "Order Summary"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {/* Gift Recipient Section (ONLY in Gift Mode) */}
              {isGiftMode ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-primary">
                    <Gift className="h-4 w-4" />
                    Recipient Information
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Name:</span>{" "}
                      {giftCtx.recipientName}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Email:</span>{" "}
                      {giftCtx.recipientEmail}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Phone:</span>{" "}
                      {giftCtx.recipientPhone}
                    </p>
                    {giftCtx.giftMessage && (
                      <p className="pt-1 italic">"{giftCtx.giftMessage}"</p>
                    )}
                  </div>
                </div>
              ) : (
                /* Normal Checkout Item List Breakdown */
                <div className="space-y-2 text-sm">
                  {cart.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="text-muted-foreground line-clamp-1">
                        {it.title}
                      </span>
                      <span className="font-medium shrink-0">
                        {formatPrice(it.discountedPrice ?? it.price, cart.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              {/* EZ Coins Section — Fixed Tier Selection (Normal Checkout only) */}
              {!isGiftMode && (
                <EzCoinRedemption
                  orderAmount={subtotal}
                  onCouponConflict={handleCouponConflictFromCoins}
                />
              )}

              {/* Pricing Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {formatPrice(subtotal, cart.currency)}
                  </span>
                </div>
                {couponDiscount > 0 && !isGiftMode && (
                  <div className="flex justify-between text-destructive">
                    <span>Coupon Discount</span>
                    <span>-{formatPrice(couponDiscount, cart.currency)}</span>
                  </div>
                )}
                {ezDiscountAmount > 0 && !isGiftMode && (
                  <div className="flex justify-between text-destructive">
                    <span>Estimated EZ Coins Discount</span>
                    <span>-{formatPrice(ezDiscountAmount, cart.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST / Tax (18%)</span>
                  <span className="font-medium">
                    {formatPrice(taxAmount, cart.currency)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base md:text-lg pt-1">
                  <span>Total Payable</span>
                  <span className="text-primary font-bold">
                    {formatPrice(totalAmount, cart.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Panel Card */}
          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg font-semibold">
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <p className="text-xs text-muted-foreground">
                Secure online payment powered by <span className="font-semibold text-foreground">Razorpay</span> (UPI, Cards, Netbanking, Wallets).
              </p>

              <Button
                onClick={handlePay}
                disabled={loading}
                className="w-full h-12 text-base font-semibold rounded-xl"
                size="lg"
              >
                {loading ? (
                  "Processing..."
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    {totalAmount <= 0 ? "Complete Order (Free)" : `Pay ${formatPrice(totalAmount, cart.currency)}`}
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/50 p-3 rounded-xl">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <p>
                  Secure 256-bit SSL encryption. 30-Day Money Back Guarantee.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
