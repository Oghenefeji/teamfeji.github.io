import type { Profile } from "./supabase";

export function profileImages(profile: Pick<Profile, "image_url_1" | "image_url_2">) {
  return [profile.image_url_1, profile.image_url_2].filter((value): value is string => Boolean(value));
}

export function hasPhotoCarousel(profile: Pick<Profile, "image_url_1" | "image_url_2">) {
  return profileImages(profile).length === 2;
}
