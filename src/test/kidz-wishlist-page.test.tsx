import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { KidzWishlist } from "@/pages/kidz/KidzWishlist";
import { wishlistService } from "@/services/wishlist.service";
import { apiClient } from "@/lib/api-client";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { CartProvider } from "@/contexts/CartContext";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "student-kid-1", role: "kids", name: "Kid Student", learningSector: "KIDS" },
    isAuthenticated: true,
  }),
}));

describe("Kidz Wishlist Page Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders page header, back link, and panda wishlist card", async () => {
    vi.spyOn(wishlistService, "list").mockResolvedValue([]);

    render(
      <MemoryRouter>
        <WishlistProvider>
          <CartProvider>
            <KidzWishlist />
          </CartProvider>
        </WishlistProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("BACK TO COURSE")).toBeInTheDocument();
    expect(screen.getByText("My Wishlist")).toBeInTheDocument();
    expect(screen.getByText("Save your favourite courses and come back to anytime!")).toBeInTheDocument();
    expect(screen.getByText("Your Wishlist")).toBeInTheDocument();
    expect(screen.getByText("Still thinking?")).toBeInTheDocument();
  });

  it("displays wishlisted courses fetched from backend", async () => {
    const mockWishlistItems = [
      {
        id: "wl-1",
        courseId: "6619d84c-6868-45d7-a07b-9751ca4aa07f",
        title: "Fun with numbers",
        thumbnailUrl: "https://example.com/math.jpg",
        price: 999,
        discountedPrice: 499,
        lessons: 12,
      },
      {
        id: "wl-2",
        courseId: "course-coding-2",
        title: "Coding for kids",
        thumbnailUrl: "https://example.com/coding.jpg",
        price: 999,
        discountedPrice: 499,
        lessons: 12,
      },
    ];

    vi.spyOn(wishlistService, "list").mockResolvedValue(mockWishlistItems as any);

    render(
      <MemoryRouter>
        <WishlistProvider>
          <CartProvider>
            <KidzWishlist />
          </CartProvider>
        </WishlistProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Fun with numbers")).toBeInTheDocument();
      expect(screen.getByText("Coding for kids")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Move to cart").length).toBe(2);
  });

  it("removes course from wishlist when remove button is clicked and triggers DELETE /wishlist", async () => {
    const mockWishlistItems = [
      {
        id: "wl-1",
        courseId: "6619d84c-6868-45d7-a07b-9751ca4aa07f",
        title: "English for Beginners",
        thumbnailUrl: "https://example.com/english.jpg",
        price: 999,
        discountedPrice: 499,
      },
    ];

    vi.spyOn(wishlistService, "list").mockResolvedValue(mockWishlistItems as any);
    const deleteSpy = vi.spyOn(apiClient, "delete").mockResolvedValue({ data: { success: true } } as any);

    render(
      <MemoryRouter>
        <WishlistProvider>
          <CartProvider>
            <KidzWishlist />
          </CartProvider>
        </WishlistProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("English for Beginners")).toBeInTheDocument();
    });

    const removeBtn = screen.getByRole("button", { name: "Remove from wishlist" });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("/wishlist", {
        params: { course_id: "6619d84c-6868-45d7-a07b-9751ca4aa07f" },
      });
      expect(screen.queryByText("English for Beginners")).not.toBeInTheDocument();
    });
  });

  it("moves course to cart and removes it from wishlist when Move to cart is clicked", async () => {
    const mockWishlistItems = [
      {
        id: "wl-1",
        courseId: "course-cart-1",
        title: "Science Experiments",
        price: 500,
        discountedPrice: 250,
      },
    ];

    vi.spyOn(wishlistService, "list").mockResolvedValue(mockWishlistItems as any);
    const deleteSpy = vi.spyOn(apiClient, "delete").mockResolvedValue({ data: { success: true } } as any);

    render(
      <MemoryRouter>
        <WishlistProvider>
          <CartProvider>
            <KidzWishlist />
          </CartProvider>
        </WishlistProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Science Experiments")).toBeInTheDocument();
    });

    const moveToCartBtn = screen.getByRole("button", { name: /move to cart/i });
    fireEvent.click(moveToCartBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("/wishlist", {
        params: { course_id: "course-cart-1" },
      });
    });
  });
});
