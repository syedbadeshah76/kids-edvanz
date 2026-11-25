import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { KidzLiveClasses } from "@/pages/kidz/KidzLiveClasses";
import { liveClassService } from "@/services/kidz/liveClassService";
import { demoClassService } from "@/services/demoClass.service";

describe("Kidz Live Classes Page Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches student live classes from GET /api/student/live-classes and does not fetch or show demo classes", async () => {
    const mockLiveClasses = [
      {
        id: "lc-1",
        liveCourseId: "course-1",
        title: "Fun with Fractions",
        courseTitle: "Maths for Champions",
        instructorName: "Srikant sir",
        scheduledAt: "2026-11-01T10:00:00Z",
        status: "SCHEDULED",
        joinUrl: "https://zoom.us/j/123456789",
      },
    ];

    const getLiveSpy = vi.spyOn(liveClassService, "getStudentLiveClasses").mockResolvedValue(mockLiveClasses as any);
    const getDemoSpy = vi.spyOn(demoClassService, "getStudentBookedDemoClasses").mockResolvedValue([] as any);

    render(
      <MemoryRouter>
        <KidzLiveClasses />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Fun with Fractions")).toBeInTheDocument();
      expect(screen.getByText("Srikant sir")).toBeInTheDocument();
      expect(screen.getByText("Join Class")).toBeInTheDocument();
    });

    expect(getLiveSpy).toHaveBeenCalled();
    // Does not call demo class service for this page
    expect(getDemoSpy).not.toHaveBeenCalled();
    expect(screen.queryByText("Fraction Face off")).not.toBeInTheDocument();
    expect(screen.queryByText("Free Demo")).not.toBeInTheDocument();
    expect(screen.queryByText(/âž/)).not.toBeInTheDocument();
  });

  it("calls liveClassService.joinLiveClass with liveClassId when Join Class is clicked", async () => {
    const mockLiveClasses = [
      {
        id: "lc-uuid-999",
        liveCourseId: "course-1",
        title: "Robotics 101",
        instructorName: "Prof. Robot",
        scheduledAt: "2026-11-01T10:00:00Z",
        status: "SCHEDULED",
      },
    ];

    vi.spyOn(liveClassService, "getStudentLiveClasses").mockResolvedValue(mockLiveClasses as any);

    const joinSpy = vi.spyOn(liveClassService, "joinLiveClass").mockResolvedValue({
      joinUrl: "https://zoom.us/j/999999",
    } as any);

    const windowSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <MemoryRouter>
        <KidzLiveClasses />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Robotics 101")).toBeInTheDocument();
    });

    const joinButton = await screen.findByRole("button", { name: /join class/i });
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(joinSpy).toHaveBeenCalledWith("lc-uuid-999");
      expect(windowSpy).toHaveBeenCalledWith("https://zoom.us/j/999999", "_blank", "noopener,noreferrer");
    });
  });

  it("renders friendly empty state when student has no live classes scheduled (classes: [])", async () => {
    vi.spyOn(liveClassService, "getStudentLiveClasses").mockResolvedValue([] as any);

    render(
      <MemoryRouter>
        <KidzLiveClasses />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No Live Classes Right Now")).toBeInTheDocument();
      expect(screen.getByText("Explore Live Courses 🚀")).toBeInTheDocument();
    });

    expect(screen.queryByText("Fraction Face off")).not.toBeInTheDocument();
    expect(screen.queryByText("Free Demo")).not.toBeInTheDocument();
    expect(screen.queryByText(/ðŸ/)).not.toBeInTheDocument();
  });

  it("disables join button and displays 'Completed' for live classes with status 'COMPLETED'", async () => {
    const mockLiveClasses = [
      {
        id: "207d5c28-583c-466c-80d3-6a80f260dac6",
        title: "arfath bhai",
        scheduledAt: "2026-10-28T16:50:00",
        status: "SCHEDULED",
        joinUrl: "https://zoom.us/j/84029811217",
      },
      {
        id: "6b2d0853-d33d-4375-a846-eb92cd794bf3",
        title: "sohail",
        scheduledAt: "2026-10-28T16:14:00",
        status: "COMPLETED",
        joinUrl: "https://zoom.us/j/86595357142",
      },
      {
        id: "97f592af-1eed-49b0-9086-4a618b00bbbd",
        title: "basic maths class",
        scheduledAt: "2026-10-28T13:10:00",
        status: "COMPLETED",
        joinUrl: "https://zoom.us/j/85847265530",
      },
    ];

    vi.spyOn(liveClassService, "getStudentLiveClasses").mockResolvedValue(mockLiveClasses as any);

    render(
      <MemoryRouter>
        <KidzLiveClasses />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("arfath bhai")).toBeInTheDocument();
      expect(screen.getByText("sohail")).toBeInTheDocument();
      expect(screen.getByText("basic maths class")).toBeInTheDocument();
    });

    // The upcoming/scheduled class button should be enabled
    const activeJoinBtn = screen.getByRole("button", { name: /join/i });
    expect(activeJoinBtn).not.toBeDisabled();

    // The completed class buttons should be disabled with text "Completed"
    const completedButtons = screen.getAllByRole("button", { name: "Completed" });
    expect(completedButtons.length).toBe(2);
    completedButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
