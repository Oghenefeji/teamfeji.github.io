import { describe, expect, it } from "vitest";

describe("Flutterwave configuration", () => {
  it("accepts the configured server secret", async () => {
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    expect(secret).toBeTruthy();
    const response = await fetch("https://api.flutterwave.com/v3/banks/NG", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(response.ok).toBe(true);
  }, 15_000);
});
