import { describe, expect, it } from "vitest";
import { fetchLiveProfiles } from "../client/src/lib/profile-feed";
import { updateProfileRecord, deleteProfileRecord } from "../client/src/lib/account-actions";

describe("live Supabase feed and account actions", () => {
  it("requests live profiles in descending creation order and uses the safe view when needed", async () => {
    const calls: string[] = [];
    const client = {
      from: (table: string) => ({
        select: (columns: string) => {
          calls.push(`${table}.select(${columns})`);
          return { order: async (column: string, options: { ascending: boolean }) => {
            calls.push(`order(${column},${options.ascending})`);
            return table === "profiles" ? { data: null, error: { message: "RLS" } } : { data: [{ id: "live-1", full_name: "Live member" }], error: null };
          } };
        },
      }),
      rpc: async () => ({ data: [], error: null }),
    };
    const profiles = await fetchLiveProfiles(client as any, false);
    expect(profiles).toEqual([{ id: "live-1", full_name: "Live member" }]);
    expect(calls).toContain("profiles.select(*)");
    expect(calls).toContain("public_profiles.select(*)");
    expect(calls).toContain("order(created_at,false)");
  });

  it("routes profile updates and deletion through the profiles table", async () => {
    const calls: string[] = [];
    const client = {
      from: () => ({
        update: (profile: Record<string, unknown>) => { calls.push(`update:${String(profile.full_name)}`); return { eq: async (key: string, value: string) => { calls.push(`eq:${key}:${value}`); return { error: null }; } }; },
        delete: () => ({ eq: async (key: string, value: string) => { calls.push(`delete-eq:${key}:${value}`); return { error: null }; } }),
      }),
    };
    await updateProfileRecord(client, "user-1", { full_name: "Updated member" });
    await deleteProfileRecord(client, "user-1");
    expect(calls).toEqual(["update:Updated member", "eq:id:user-1", "delete-eq:id:user-1"]);
  });
});
