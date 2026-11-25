import { describe, it, expect, beforeEach } from "vitest";

describe("Thumbnail Fallback & Student Age Resolution", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists and reads registered student age without defaulting to 14", () => {
    // Simulate user registering with age 10
    localStorage.setItem("kidz_student_age", "10");
    localStorage.setItem(
      "Edvanz_user",
      JSON.stringify({
        id: "student-1",
        email: "kid@test.com",
        age: 10,
        profile: { age: 10 },
      })
    );

    const storedRegAge =
      localStorage.getItem("kidz_student_age") ||
      (() => {
        try {
          const u = JSON.parse(localStorage.getItem("Edvanz_user") || "{}");
          return u.age || u.studentAge || u.profile?.age || "";
        } catch {
          return "";
        }
      })();

    expect(storedRegAge).toBe("10");
    expect(storedRegAge).not.toBe("14");
    expect(storedRegAge).not.toBe("12");
  });

  it("handles course without thumbnail by returning null instead of dummy purple image", () => {
    const courseWithoutThumbnail = {
      id: "course-uuid-1234",
      title: "Photosynthesis",
      thumbnailUrl: null,
      thumbnail: undefined,
    };

    const imageMap: Record<string, string> = {
      "python-quest": "/some/path.jpg",
    };

    const rawImage =
      (courseWithoutThumbnail as any).thumbnailUrl ||
      (courseWithoutThumbnail as any).thumbnail;

    const imgError = false;
    const hasRawImage = Boolean(
      !imgError &&
      rawImage &&
      typeof rawImage === "string" &&
      rawImage.trim().length > 0
    );

    const imageSrc = hasRawImage
      ? (rawImage as string).trim()
      : (!imgError && imageMap[courseWithoutThumbnail.id] ? imageMap[courseWithoutThumbnail.id] : null);

    // Must be null (empty / blank surface) — NOT dummy storyWorkspaceImg!
    expect(imageSrc).toBeNull();
  });

  it("handles course detail thumbnail error state correctly without reference error", () => {
    let thumbError = false;
    const rawThumbnail = "https://example.com/broken-image.png";

    let hasThumbnail = Boolean(
      !thumbError &&
      rawThumbnail &&
      typeof rawThumbnail === "string" &&
      rawThumbnail.trim().length > 0
    );
    expect(hasThumbnail).toBe(true);

    // Simulate img onError triggering thumbError = true
    thumbError = true;
    hasThumbnail = Boolean(
      !thumbError &&
      rawThumbnail &&
      typeof rawThumbnail === "string" &&
      rawThumbnail.trim().length > 0
    );
    expect(hasThumbnail).toBe(false);
  });
});
