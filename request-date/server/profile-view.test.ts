import { describe, expect, it } from "vitest";
import { hasPhotoCarousel, profileImages } from "../client/src/lib/profile-view";

describe("live profile image rendering", () => {
  it("renders one photo without carousel controls", () => {
    const profile = { image_url_1: "https://cdn.example/one.jpg", image_url_2: null };
    expect(profileImages(profile)).toHaveLength(1);
    expect(hasPhotoCarousel(profile)).toBe(false);
  });

  it("renders two photos with carousel controls", () => {
    const profile = { image_url_1: "https://cdn.example/one.jpg", image_url_2: "https://cdn.example/two.jpg" };
    expect(profileImages(profile)).toHaveLength(2);
    expect(hasPhotoCarousel(profile)).toBe(true);
  });
});
