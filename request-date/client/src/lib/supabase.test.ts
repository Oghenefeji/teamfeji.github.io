import { describe, expect, it } from "vitest";
import { isValidWhatsApp, normalizeWhatsApp, whatsappLink } from "./supabase";

describe("WhatsApp contact helpers", () => {
  it("normalizes local and formatted phone numbers", () => {
    expect(normalizeWhatsApp("0801 234-5678")).toBe("2348012345678");
    expect(isValidWhatsApp("0801 234-5678")).toBe(true);
    expect(isValidWhatsApp("12345")).toBe(false);
    expect(normalizeWhatsApp("+234 801 234 5678")).toBe("2348012345678");
  });

  it("creates a prefilled WhatsApp link", () => {
    expect(whatsappLink("+234 801 234 5678")).toBe(
      "https://wa.me/2348012345678?text=Hi!%20I%20saw%20your%20profile%20on%20Request%20Date",
    );
  });
});
