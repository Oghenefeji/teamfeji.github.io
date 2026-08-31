import { describe, expect, it } from "vitest";
import { isExistingUserError, profileUpsertOptions } from "../client/src/lib/request-date-auth";
import { signUpOrSignIn, upsertProfileRecord } from "../client/src/lib/auth-flow";

describe("signup duplicate handling", () => {
  it("recognizes Supabase existing-user errors", () => {
    expect(isExistingUserError("User already registered")).toBe(true);
    expect(isExistingUserError("A user already exists with this email")).toBe(true);
    expect(isExistingUserError("Invalid login credentials")).toBe(false);
  });

  it("falls back to password sign-in when signup reports an existing user", async () => {
    const calls: string[] = [];
    const auth = {
      signUp: async () => { calls.push("signUp"); return { data: { session: null }, error: { message: "User already registered" } }; },
      signInWithPassword: async () => { calls.push("signInWithPassword"); return { data: { session: { user: { id: "user-1" } } }, error: null }; },
    };
    const result = await signUpOrSignIn(auth, "member@example.com", "password", "signup");
    expect(calls).toEqual(["signUp", "signInWithPassword"]);
    expect(result.error).toBeNull();
    expect(result.data.session).toBeTruthy();
  });

  it("passes the id conflict option to the actual profile upsert call", async () => {
    let receivedOptions: unknown;
    const client = { from: () => ({ upsert: async (_profile: Record<string, unknown>, options: unknown) => { receivedOptions = options; return { error: null }; } }) };
    await upsertProfileRecord(client, { id: "user-1", full_name: "Member" });
    expect(receivedOptions).toEqual({ onConflict: "id" });
    expect(profileUpsertOptions).toEqual({ onConflict: "id" });
  });
});
