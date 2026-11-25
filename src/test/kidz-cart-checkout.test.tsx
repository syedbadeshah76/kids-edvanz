import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";

// Mock dependencies
const mockCart = {
  items: [
    {
      id: "item-1",
      courseId: "course-123",
      productId: "prod-123",
      title: "Interactive Python for Kids",
      thumbnail: "/test-thumb.jpg",
      price: 999,
      discountedPrice: 499,
      isLive: false,
      totalLessons: 14,
    },
  ],
  subtotal: 499,
  discount: 0,
  currency: "INR",
  couponCode: null,
  removeFromCart: vi.fn(),
  applyCoupon: vi.fn(),
  removeCoupon: vi.fn(),
  clearCart: vi.fn(),
};

vi.mock("@/contexts/WishlistContext", () => ({
  useWishlist: () => ({
    items: [],
    itemCount: 0,
    loading: false,
    isInWishlist: () => false,
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    toggleWishlist: vi.fn(),
  }),
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => mockCart,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-kid-1",
      name: "Aryan Kid",
      email: "aryan@example.com",
      role: "kids",
      learningSector: "KIDS",
    },
    isAuthenticated: true,
  }),
}));

vi.mock("@/contexts/GiftCheckoutContext", () => ({
  useGiftCheckout: () => ({
    isGiftCheckout: false,
    selectedCourses: [],
    recipientName: "",
    recipientEmail: "",
    recipientPhone: "",
    giftMessage: "",
    deactivateGiftCheckout: vi.fn(),
  }),
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => ({
    wallet: { balance: 0 },
    quote: null,
    selectedTier: null,
    clearRedemption: vi.fn(),
  }),
}));

vi.mock("@/services/courses.service", () => ({
  coursesService: {
    getCourse: vi.fn().mockResolvedValue({
      id: "course-123",
      title: "Interactive Python for Kids",
      thumbnailUrl: "/test-thumb.jpg",
      totalLessons: 14,
    }),
  },
}));

describe("Kidz Cart and Checkout Page Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Kidz Cart according to Figma design layout", () => {
    render(
      <MemoryRouter initialEntries={["/kidz/cart"]}>
        <Cart />
      </MemoryRouter>
    );

    expect(screen.getByText(/BACK TO COURSE/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My Cart" })).toBeInTheDocument();
    expect(screen.getByText(/You have 1 Course in your cart!/i)).toBeInTheDocument();
    expect(screen.getByText("Interactive Python for Kids")).toBeInTheDocument();
    expect(screen.getByText("Have a Coupon Code?")).toBeInTheDocument();
    expect(screen.getByText("Order Summary")).toBeInTheDocument();
    expect(screen.getByText(/Proceed To Checkout/i)).toBeInTheDocument();
    expect(screen.getByText(/Enjoy More Learning, More Savings!/i)).toBeInTheDocument();
  });

  it("renders Kidz Checkout with matching Figma theme, student info, and payment summary", () => {
    render(
      <MemoryRouter initialEntries={["/kidz/checkout"]}>
        <Checkout />
      </MemoryRouter>
    );

    expect(screen.getByText(/BACK TO CART/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Checkout" })).toBeInTheDocument();
    expect(screen.getByText("Interactive Python for Kids")).toBeInTheDocument();
    expect(screen.getByText("Aryan Kid")).toBeInTheDocument();
    expect(screen.getByText("Verified Student")).toBeInTheDocument();
    expect(screen.getByText(/Kids Explorer/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Safe & Secure Payment with Razorpay/i)).toBeInTheDocument();
    expect(screen.getByText("Order Summary")).toBeInTheDocument();
    expect(screen.getByText(/GST \/ Tax \(18%\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pay ₹/i })).toBeInTheDocument();
  });
});
