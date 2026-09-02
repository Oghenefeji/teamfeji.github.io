import { describe, expect, it } from "vitest";
import { fetchLiveProfiles } from "../client/src/lib/profile-feed";
import { updateProfileRecord, deleteProfileRecord } from "../client/src/lib/account-actions";

describe("live Supabase feed and account actions", () => {
  it("uses only the privacy-safe public view for unpaid browsing", async () => {
    const calls: string[] = [];
    const client = {
      from: (table: string) => ({
        select: (columns: string) => {
          calls.push(`${table}.select(${columns})`);
          return { order: async (column: string, options: { ascending: boolean }) => {
            calls.push(`order(${column},${options.ascending})`);
            return { data: [{ id: "live-1", full_name: "Live member" }], error: null };
          } };
        },
      }),
      rpc: async () => ({ data: [], error: null }),
    };
    const profiles = await fetchLiveProfiles(client as any, false);
    expect(profiles).toEqual([{ id: "live-1", full_name: "Live member" }]);
    expect(calls).toEqual(["public_profiles.select(*)", "order(created_at,false)"]);
  });

  it("uses the paid RPC so WhatsApp numbers are returned after unlock", async () => {
    const calls: string[] = [];
    const client = {
      from: () => { throw new Error("paid browsing must not query a public table"); },
      rpc: async (name: string) => { calls.push(name); return { data: [{ id: "live-1", full_name: "Live member", whatsapp_number: "08012345678" }], error: null }; },
    };
    const profiles = await fetchLiveProfiles(client as any, true);
    expect(profiles).toEqual([{ id: "live-1", full_name: "Live member", whatsapp_number: "08012345678" }]);
    expect(calls).toEqual(["get_paid_profiles"]);
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
