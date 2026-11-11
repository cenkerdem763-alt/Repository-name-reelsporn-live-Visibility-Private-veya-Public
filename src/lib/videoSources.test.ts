import { describe, expect, it } from "vitest";
import { extractIframeSrc, isDirectVideoSource, normalizeProviderSource } from "@/lib/videoSources";

describe("video source normalization", () => {
  it("extracts iframe src and decodes html entities", () => {
    expect(extractIframeSrc('<iframe src="https://www.pornhub.com/embed/abc&amp;autoplay=1"></iframe>')).toBe(
      "https://www.pornhub.com/embed/abc&autoplay=1"
    );
  });

  it("normalizes Pornhub watch urls to embed urls", () => {
    expect(normalizeProviderSource("https://www.pornhub.com/view_video.php?viewkey=ph123")).toBe(
      "https://www.pornhub.com/embed/ph123"
    );
  });

  it("normalizes XVideos page urls to embed urls", () => {
    expect(normalizeProviderSource("https://www.xvideos.com/video123456/sample-title")).toBe(
      "https://www.xvideos.com/embedframe/123456"
    );
    expect(normalizeProviderSource("https://www.xvideos.com/video.abcd123/sample-title")).toBe(
      "https://www.xvideos.com/embedframe/abcd123"
    );
  });

  it("normalizes XNXX page urls to embed urls", () => {
    expect(normalizeProviderSource("https://www.xnxx.com/video-abc123/sample-title")).toBe(
      "https://www.xnxx.com/embedframe/abc123"
    );
  });

  it("normalizes xHamster page urls to embed urls", () => {
    expect(normalizeProviderSource("https://xhamster.com/videos/sample-title-abc123")).toBe(
      "https://xhamster.com/embed/abc123"
    );
  });

  it("keeps direct video sources detectable", () => {
    expect(isDirectVideoSource("https://cdn.example.com/video.mp4?token=1")).toBe(true);
    expect(isDirectVideoSource("https://www.pornhub.com/embed/ph123")).toBe(false);
  });
});
