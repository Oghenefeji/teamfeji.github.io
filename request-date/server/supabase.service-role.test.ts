import { describe, expect, it } from "vitest";

describe("Supabase service configuration", () => {
  it("accepts the configured service-role key", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(url).toMatch(/^https:\/\//);
    expect(serviceKey).toBeTruthy();
    const response = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: serviceKey as string, Authorization: `Bearer ${serviceKey}` },
    });
    expect([200, 404]).toContain(response.status);
  }, 15_000);
});
