import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { FileUploadButton } from "../FileUploadButton";

describe("FileUploadButton", () => {
  it("renders safely without upload object and does not throw", () => {
    const { container } = render(
      <FileUploadButton
        label="Upload CV"
        accept="application/pdf,.pdf"
      />
    );
    expect(container).toBeDefined();
    expect(container.textContent).toContain("Upload CV");
  });

  it("renders safely with full upload state object", () => {
    const mockUpload = {
      file: null,
      fileKey: "",
      status: "idle" as const,
      progress: 0,
      error: "",
      isBusy: false,
      isComplete: false,
      selectFile: vi.fn(),
      retry: vi.fn(),
      reset: vi.fn(),
    };

    const { container } = render(
      <FileUploadButton
        label="Upload intro video"
        accept="video/mp4,.mp4"
        upload={mockUpload}
      />
    );
    expect(container).toBeDefined();
    expect(container.textContent).toContain("Upload intro video");
  });

  it("displays progress when upload is busy", () => {
    const mockUpload = {
      file: new File(["dummy"], "cv.pdf", { type: "application/pdf" }),
      fileKey: "",
      status: "uploading" as const,
      progress: 45,
      error: "",
      isBusy: true,
      isComplete: false,
      selectFile: vi.fn(),
      retry: vi.fn(),
      reset: vi.fn(),
    };

    const { container } = render(
      <FileUploadButton
        label="Upload CV"
        accept="application/pdf,.pdf"
        upload={mockUpload}
      />
    );
    expect(container.textContent).toContain("Uploading 45%");
  });

  it("displays Replace File when upload is complete", () => {
    const mockUpload = {
      file: new File(["dummy"], "video.mp4", { type: "video/mp4" }),
      fileKey: "some-key",
      status: "success" as const,
      progress: 100,
      error: "",
      isBusy: false,
      isComplete: true,
      selectFile: vi.fn(),
      retry: vi.fn(),
      reset: vi.fn(),
    };

    const { container } = render(
      <FileUploadButton
        label="Upload intro video"
        accept="video/mp4,.mp4"
        upload={mockUpload}
      />
    );
    expect(container.textContent).toContain("Replace File");
  });
});
