import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import React from "react";
import { LearningSectorSwitcher } from "@/components/home/LearningSectorSwitcher";
import { LiveTrainingCoursesSection } from "@/components/home/LiveTrainingCoursesSection";
import { RecordedCoursesSection } from "@/components/home/RecordedCoursesSection";
import { ExploreCategorySection } from "@/components/home/ExploreCategorySection";
import { liveCoursesService } from "@/services/liveCourses.service";
import { coursesService } from "@/services/courses.service";
import { categoriesService } from "@/services/categories.service";

describe("Public Page Learning Sector Selection & Filtering", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("LearningSectorSwitcher component", () => {
    it("renders both IT and Kidz selection buttons", () => {
      const onSectorChange = vi.fn();
      render(
        <LearningSectorSwitcher
          selectedSector="IT"
          onSectorChange={onSectorChange}
        />
      );

      const itBtn = screen.getByRole("button", { name: /it/i });
      const kidzBtn = screen.getByRole("button", { name: /kidz/i });

      expect(itBtn).toBeInTheDocument();
      expect(kidzBtn).toBeInTheDocument();
      expect(itBtn).toHaveAttribute("aria-pressed", "true");
      expect(kidzBtn).toHaveAttribute("aria-pressed", "false");
    });

    it("triggers onSectorChange when clicking Kidz or IT", () => {
      const onSectorChange = vi.fn();
      render(
        <LearningSectorSwitcher
          selectedSector="IT"
          onSectorChange={onSectorChange}
        />
      );

      const kidzBtn = screen.getByRole("button", { name: /kidz/i });
      fireEvent.click(kidzBtn);
      expect(onSectorChange).toHaveBeenCalledWith("KIDS");

      const itBtn = screen.getByRole("button", { name: /it/i });
      fireEvent.click(itBtn);
      expect(onSectorChange).toHaveBeenCalledWith("IT");
    });
  });

  describe("LiveTrainingCoursesSection sector isolation", () => {
    it("displays only IT live courses when IT is selected and passes learningSector: IT to service", async () => {
      const mockLiveCatalog = [
        {
          id: "live-1",
          title: "Advance Power Bi",
          learningSector: "IT",
          originalPrice: 786.99,
          discountedPrice: 641.99,
        },
        {
          id: "live-2",
          title: "Kids Coding Fun",
          learningSector: "KIDS",
          originalPrice: 499.00,
          discountedPrice: 399.00,
        },
      ];

      vi.spyOn(liveCoursesService, "getCatalogLiveCourses").mockResolvedValue(mockLiveCatalog);

      render(
        <BrowserRouter>
          <LiveTrainingCoursesSection selectedSector="IT" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Advance Power Bi")).toBeInTheDocument();
      });

      expect(screen.queryByText("Kids Coding Fun")).not.toBeInTheDocument();
      expect(liveCoursesService.getCatalogLiveCourses).toHaveBeenCalledWith(
        expect.objectContaining({ learningSector: "IT" })
      );
    });

    it("displays only Kids live courses when KIDS is selected, and displays friendly empty state if none", async () => {
      vi.spyOn(liveCoursesService, "getCatalogLiveCourses").mockResolvedValue([]);

      render(
        <BrowserRouter>
          <LiveTrainingCoursesSection selectedSector="KIDS" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No Live Courses Available for Kidz/i)).toBeInTheDocument();
      });
      // The section header and buttons must remain visible
      expect(screen.getByRole("button", { name: /it/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /kidz/i })).toBeInTheDocument();
    });
  });

  describe("RecordedCoursesSection sector isolation", () => {
    it("displays only KIDS recorded courses when Kidz is selected", async () => {
      const mockCourses = [
        {
          id: "rec-1",
          title: "React js by badshahs",
          learningSector: "KIDS",
          discountedPrice: 4999.00,
          originalPrice: 6999.00,
        },
        {
          id: "rec-2",
          title: "IT Kubernetes Masterclass",
          learningSector: "IT",
          discountedPrice: 4999.00,
          originalPrice: 6999.00,
        },
      ];

      vi.spyOn(coursesService, "getPublicCourses").mockResolvedValue({
        success: true,
        data: mockCourses,
      });

      render(
        <BrowserRouter>
          <RecordedCoursesSection selectedSector="KIDS" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("React js by badshahs")).toBeInTheDocument();
      });

      expect(screen.queryByText("IT Kubernetes Masterclass")).not.toBeInTheDocument();
      expect(coursesService.getPublicCourses).toHaveBeenCalledWith(0, 100, "KIDS");
    });
  });

  describe("ExploreCategorySection sector isolation", () => {
    it("displays only Kids categories and matching Kids courses when Kidz is selected", async () => {
      const mockCategories = [
        {
          id: "cat-math",
          name: "MATHEMATICS",
          slug: "mathematics",
          learningSector: "KIDS",
        },
        {
          id: "cat-it",
          name: "Businsess World",
          slug: "businsessworld",
          learningSector: "IT",
        },
      ];

      const mockCourses = [
        {
          id: "course-math-1",
          title: "Math course for kids",
          categoryId: "cat-math",
          learningSector: "KIDS",
          discountedPrice: 4999.00,
          originalPrice: 6999.00,
        },
        {
          id: "course-it-1",
          title: "Enterprise SQL",
          categoryId: "cat-it",
          learningSector: "IT",
          discountedPrice: 199.00,
          originalPrice: 299.00,
        },
      ];

      vi.spyOn(categoriesService, "getPublicCategories").mockResolvedValue({
        success: true,
        data: mockCategories as any,
      });

      vi.spyOn(coursesService, "getPublicCourses").mockResolvedValue({
        success: true,
        data: mockCourses,
      });

      vi.spyOn(liveCoursesService, "getCatalogLiveCourses").mockResolvedValue([]);

      render(
        <BrowserRouter>
          <ExploreCategorySection selectedSector="KIDS" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText("MATHEMATICS").length).toBeGreaterThanOrEqual(1);
      });

      // IT category should be filtered out
      expect(screen.queryByText("Businsess World")).not.toBeInTheDocument();

      // Only Math course should appear in the table
      await waitFor(() => {
        expect(screen.getByText("Math course for kids")).toBeInTheDocument();
      });
      expect(screen.queryByText("Enterprise SQL")).not.toBeInTheDocument();
    });
  });
});
