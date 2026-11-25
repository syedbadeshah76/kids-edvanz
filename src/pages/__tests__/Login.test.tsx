import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Login from "../Login";
import { authService } from "@/services/auth.service";

vi.mock("@/services/auth.service", () => ({
  authService: {
    login: vi.fn(),
    verifyLoginOtp: vi.fn(),
    resendOtp: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    loginWithToken: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    addToCart: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("Login Screen (Figma Design)", () => {
  it("renders Screen 1 with Welcome back pill, email input, and sign-in button", () => {
    render(
      <BrowserRouter>
        <Login isModal={true} />
      </BrowserRouter>
    );

    expect(screen.getByText("Welcome back")).toBeDefined();
    expect(screen.getByText(/Log in to Edvanz/i)).toBeDefined();
    expect(screen.getByText("Continue where your learning left off.")).toBeDefined();
    expect(screen.getByPlaceholderText("you@example.com")).toBeDefined();
    expect(screen.getByText("Email me a sign-in code")).toBeDefined();
    expect(screen.getByText("Create an account")).toBeDefined();
  });

  it("transitions to Screen 2 (OTP) upon successful email submission", async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({
      message: "OTP sent successfully",
    });

    render(
      <BrowserRouter>
        <Login isModal={true} />
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitBtn = screen.getByText("Email me a sign-in code");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({ email: "test@example.com" });
    });

    await waitFor(() => {
      expect(screen.getByText("Email verification")).toBeDefined();
      expect(screen.getByText("Enter your sign-in code")).toBeDefined();
      expect(screen.getByText("Change email")).toBeDefined();
      expect(screen.getByText("Verify & sign in")).toBeDefined();
    });
  });

  it("allows going back to change email from OTP screen", async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({
      message: "OTP sent successfully",
    });

    render(
      <BrowserRouter>
        <Login isModal={true} />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "student@example.com" },
    });
    fireEvent.click(screen.getByText("Email me a sign-in code"));

    await waitFor(() => {
      expect(screen.getByText("Change email")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Change email"));

    await waitFor(() => {
      expect(screen.getByText("Welcome back")).toBeDefined();
      expect(screen.getByText("Email me a sign-in code")).toBeDefined();
    });
  });
});
