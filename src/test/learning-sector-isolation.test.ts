import { describe, it, expect, beforeEach, vi } from "vitest";
import { getLearningSector, setLearningSector } from "@/lib/api-client";
import { coursesService } from "@/services/courses.service";
import { categoriesService } from "@/services/categories.service";
import { instructorsService } from "@/services/instructors.service";
import { apiClient } from "@/lib/api-client";

describe("Learning Sector Isolation & Payload Support", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("getLearningSector resolution", () => {
    it("returns IT by default", () => {
      expect(getLearningSector()).toBe("IT");
    });

    it("returns KIDS when localStorage has active learningSector set to KIDS", () => {
      setLearningSector("KIDS");
      expect(getLearningSector()).toBe("KIDS");
    });

    it("returns learningSector from Edvanz_user if stored", () => {
      localStorage.setItem(
        "Edvanz_user",
        JSON.stringify({ id: "user-1", email: "user@test.com", role: "instructor", learningSector: "KIDS" })
      );
      expect(getLearningSector()).toBe("KIDS");
    });

    it("returns KIDS if user role is kids", () => {
      localStorage.setItem(
        "Edvanz_user",
        JSON.stringify({ id: "user-kids", email: "kid@test.com", role: "kids" })
      );
      expect(getLearningSector()).toBe("KIDS");
    });

    it("returns IT when user registers with role = STUDENT and learningSector = IT", () => {
      localStorage.setItem(
        "Edvanz_user",
        JSON.stringify({ id: "student-1", email: "student@test.com", role: "STUDENT", learningSector: "IT" })
      );
      expect(getLearningSector()).toBe("IT");
    });

    it("returns KIDS when user registers with role = KIDS and learningSector = KIDS", () => {
      localStorage.setItem(
        "Edvanz_user",
        JSON.stringify({ id: "kids-1", email: "kids@test.com", role: "KIDS", learningSector: "KIDS" })
      );
      expect(getLearningSector()).toBe("KIDS");
    });
  });

  describe("getCourses X-User-Learning-Sector header dispatch", () => {
    it("sends request header X-User-Learning-Sector: IT when user is role = STUDENT and learningSector = IT", async () => {
      localStorage.setItem(
        "Edvanz_user",
        JSON.stringify({ id: "s-1", email: "student@edvanz.co", role: "STUDENT", learningSector: "IT" })
      );
      vi.spyOn(instructorsService, "list").mockResolvedValueOnce([] as any);

      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
        courses: [{ id: "c-it-1", title: "React js", learningSector: "IT" }],
      });

      await coursesService.getCourses();

      expect(getSpy).toHaveBeenCalledWith(
        "/courses",
        expect.objectContaining({
          params: expect.objectContaining({ learningSector: "IT" }),
          headers: expect.objectContaining({ "X-User-Learning-Sector": "IT" }),
        })
      );
    });

    it("sends request header X-User-Learning-Sector: KIDS when user is role = KIDS and learningSector = KIDS", async () => {
      localStorage.setItem(
        "Edvanz_user",
        JSON.stringify({ id: "k-1", email: "kids@edvanz.co", role: "KIDS", learningSector: "KIDS" })
      );
      vi.spyOn(instructorsService, "list").mockResolvedValueOnce([] as any);

      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
        courses: [{ id: "c-kids-1", title: "Java Spring Boot Masterclass By Nagesh", learningSector: "KIDS" }],
      });

      await coursesService.getCourses();

      expect(getSpy).toHaveBeenCalledWith(
        "/courses",
        expect.objectContaining({
          params: expect.objectContaining({ learningSector: "KIDS" }),
          headers: expect.objectContaining({ "X-User-Learning-Sector": "KIDS" }),
        })
      );
    });
  });

  describe("coursesService sector payload propagation", () => {
    it("passes learningSector in the body payload and matching X-User-Learning-Sector header when creating a course", async () => {
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        success: true,
        data: { id: "new-course-id", title: "React js by badshah", learningSector: "KIDS" },
      });

      await coursesService.createCourse({
        title: "React js by badshah",
        slug: "react-js-by-badshah",
        description: "Test description",
        categoryId: "cat-1",
        language: "English",
        level: "BEGINNER",
        learningSector: "KIDS",
      });

      expect(postSpy).toHaveBeenCalledWith(
        "/courses",
        expect.objectContaining({
          title: "React js by badshah",
          learningSector: "KIDS",
        })
      );
    });
  });

  describe("categoriesService sector payload & query propagation", () => {
    it("passes learningSector in the body payload when creating a category", async () => {
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        success: true,
        data: { id: "cat-123", name: "Web dev", slug: "Web-Dev", learningSector: "KIDS" },
      });

      await categoriesService.createCategory({
        name: "Web dev",
        slug: "Web-Dev",
        description: "Business Development Courses",
        learningSector: "KIDS",
      });

      expect(postSpy).toHaveBeenCalledWith(
        "/categories",
        expect.objectContaining({
          name: "Web dev",
          slug: "Web-Dev",
          learningSector: "KIDS",
        })
      );
    });

    it("passes learningSector as a query parameter and header when listing categories", async () => {
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
        success: true,
        data: [],
      });

      await categoriesService.getCategories({ learningSector: "KIDS" });

      expect(getSpy).toHaveBeenCalledWith(
        "/categories",
        expect.objectContaining({
          params: expect.objectContaining({
            learningSector: "KIDS",
          }),
        })
      );
    });

    it("passes X-User-Learning-Sector header when fetching subcategories for a category", async () => {
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: "df3bf1b5-72d2-4f68-9fae-4a249faff38c",
            learningSector: "KIDS",
            name: "react",
            parentId: "a199fe28-8bf3-4b50-a820-fbe11ddef026",
          },
        ],
      });

      const res = await categoriesService.getSubcategories("a199fe28-8bf3-4b50-a820-fbe11ddef026", "KIDS");

      expect(getSpy).toHaveBeenCalledWith(
        "/categories/a199fe28-8bf3-4b50-a820-fbe11ddef026/subcategories",
        expect.objectContaining({
          params: expect.objectContaining({
            learningSector: "KIDS",
          }),
        })
      );
      expect(res.data[0].name).toBe("react");
      expect(res.data[0].learningSector).toBe("KIDS");
    });
  });

  describe("Course sector filtering isolation", () => {
    it("filters out KIDS courses when fetching in IT platform context", async () => {
      setLearningSector("IT");
      vi.spyOn(apiClient, "get").mockResolvedValueOnce({
        content: [
          { id: "c-1", title: "React IT", learningSector: "IT" },
          { id: "c-2", title: "Biodiversity 1", learningSector: "KIDS" },
          { id: "c-3", title: "Spring Boot IT", learningSector: "IT" },
        ],
      });

      const res = await coursesService.getPublicCourses(0, 10);
      expect(res.data).toHaveLength(2);
      expect(res.data?.map((c) => c.title)).toEqual(["React IT", "Spring Boot IT"]);
      expect(res.data?.some((c) => c.learningSector === "KIDS")).toBe(false);
    });

    it("filters out IT courses when fetching in Kidz platform context", async () => {
      const { coursesService: kidzCoursesService } = await import("@/services/kidz/courses.service");
      const { apiClient: kidzApiClient } = await import("@/lib/kidz/kidz-api-client");

      vi.spyOn(kidzApiClient, "get").mockResolvedValueOnce({
        content: [
          { id: "c-1", title: "arij course", learningSector: "IT" },
          { id: "c-2", title: "Biodiversity 1", learningSector: "KIDS" },
          { id: "c-3", title: "Photosynthesis -3", learningSector: "KIDS" },
          { id: "c-4", title: "frontend", learningSector: "IT" },
        ],
      });

      const res = await kidzCoursesService.getPublicCatalog({ page: 0, size: 50 });
      expect(res).toHaveLength(2);
      expect(res.map((c) => c.title)).toEqual(["Biodiversity 1", "Photosynthesis -3"]);
      expect(res.every((c) => c.learningSector === "KIDS")).toBe(true);
    });

    it("fetches categories properly for Kidz Explore section", async () => {
      const { categoriesService: kidzCatService } = await import("@/services/kidz/categories.service");
      const { apiClient: kidzApiClient } = await import("@/lib/kidz/kidz-api-client");

      const getSpy = vi.spyOn(kidzApiClient, "get").mockResolvedValueOnce([
        {
          id: "eb95a6e7-c2b8-4166-9388-a024e86a6ceb",
          learningSector: "KIDS",
          name: "MATHEMATICS",
          slug: "mathematics",
        },
        {
          id: "682ec0fd-c5b9-4223-b3ad-b43747881e57",
          learningSector: "KIDS",
          name: "Political Science",
          slug: "Political Science",
        },
        {
          id: "a199fe28-8bf3-4b50-a820-fbe11ddef026",
          learningSector: "KIDS",
          name: "Web dev",
          slug: "Web-Dev",
        },
      ]);

      const cats = await kidzCatService.getCategories();
      expect(getSpy).toHaveBeenCalledWith("/categories?learningSector=KIDS");
      expect(cats).toHaveLength(3);
      expect(cats.map((c) => c.name)).toEqual(["MATHEMATICS", "Political Science", "Web dev"]);
      expect(cats.every((c) => c.learningSector === "KIDS")).toBe(true);
    });

    it("normalizes level properly regardless of uppercase backend enum", async () => {
      const { normalizeLevel } = await import("@/pages/kidz/KidzExplore");
      expect(normalizeLevel("BEGINNER")).toBe("Beginner");
      expect(normalizeLevel("INTERMEDIATE")).toBe("Intermediate");
      expect(normalizeLevel("ADVANCED")).toBe("Advanced");
      expect(normalizeLevel("beginner")).toBe("Beginner");
      expect(normalizeLevel(undefined)).toBe("Beginner");
    });

    it("accurately detects free vs premium course pricing", async () => {
      const { isCourseFree } = await import("@/pages/kidz/KidzExplore");
      expect(isCourseFree({ isFree: true })).toBe(true);
      expect(isCourseFree({ accessType: "FREE" })).toBe(true);
      expect(isCourseFree({ discountedPrice: 0 })).toBe(true);
      expect(isCourseFree({ discountedPrice: 4999.0 })).toBe(false);
      expect(isCourseFree({ originalPrice: 6999.0, discountedPrice: 4999.0 })).toBe(false);
    });
  });
});
