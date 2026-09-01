import { describe, expect, it } from "vitest";
import { completeVerifiedPayment, confirmPaymentAndRefresh } from "../client/src/lib/payment-callback";
import { canCelebrateAfterCheckoutClose } from "../client/src/lib/payment-success";

describe("payment callback synchronization", () => {
  it("confirms through RPC, updates local access, refreshes data, and closes checkout", async () => {
    const events: string[] = [];
    const client = {
      rpc: async (name: string, args: Record<string, string>) => {
        events.push(`${name}:${args.tx_ref}:${args.flw_ref_id}`);
        return { error: null };
      },
    };

    const result = await completeVerifiedPayment({
      client,
      rpcArgs: { tx_ref: "RD-123", flw_ref_id: "FLW-456" },
      userId: "member-1",
      onPaid: () => events.push("paid-local"),
      refreshPaidProfile: async (id) => events.push(`paid-profile:${id}`),
      refreshOwnProfile: async (id) => events.push(`own-profile:${id}`),
      refreshProfiles: async () => events.push("feed"),
      checkout: { close: () => events.push("close") },
      onCheckoutCloseUnavailable: () => events.push("close-unavailable"),
    });

    expect(result).toEqual({ confirmed: true, checkoutClosed: true });
    expect(events).toEqual(["confirm_user_payment:RD-123:FLW-456", "paid-local", "paid-profile:member-1", "own-profile:member-1", "feed", "close"]);
  });

  it("runs the verified callback through explicit close and fallback close into one-time celebration gating", async () => {
    const runLifecycle = async (closeMode: "explicit" | "fallback", expectedCloseEvent: string, simulateUserClose: boolean) => {
      const events: string[] = [];
      const checkout = closeMode === "explicit" ? { close: () => events.push("close") } : {};
      let verified = false;
      let checkoutClosed = false;
      let alreadyCelebrated = false;
      const client = { rpc: async () => { events.push("rpc"); return { error: null }; } };

      const completion = await completeVerifiedPayment({
        client,
        rpcArgs: { tx_ref: "RD-789", flw_ref_id: "FLW-999" },
        userId: "member-1",
        onPaid: () => { verified = true; events.push("paid-local"); },
        refreshPaidProfile: async () => events.push("paid-profile"),
        refreshOwnProfile: async () => events.push("own-profile"),
        refreshProfiles: async () => events.push("feed"),
        checkout,
        onCheckoutCloseUnavailable: () => events.push("fallback"),
      });

      expect(canCelebrateAfterCheckoutClose({ status: "successful", verified, checkoutClosed: false, alreadyCelebrated })).toBe(false);
      checkoutClosed = completion.checkoutClosed;
      expect(canCelebrateAfterCheckoutClose({ status: "successful", verified, checkoutClosed, alreadyCelebrated })).toBe(simulateUserClose ? false : true);
      if (simulateUserClose) checkoutClosed = true;
      if (canCelebrateAfterCheckoutClose({ status: "successful", verified, checkoutClosed, alreadyCelebrated })) {
        alreadyCelebrated = true;
        events.push("celebration");
      }
      expect(canCelebrateAfterCheckoutClose({ status: "successful", verified, checkoutClosed, alreadyCelebrated })).toBe(false);
      expect(events).toEqual(["rpc", "paid-local", "paid-profile", "own-profile", "feed", expectedCloseEvent, "celebration"]);
    };

    await runLifecycle("explicit", "close", false);
    await runLifecycle("fallback", "fallback", true);
  });

  it("does not refresh or unlock when the RPC confirmation fails", async () => {
    const events: string[] = [];
    const expectedError = new Error("claim expired");
    const client = { rpc: async () => ({ error: expectedError }) };

    await expect(confirmPaymentAndRefresh({
      client,
      rpcArgs: { tx_ref: "RD-123", flw_ref_id: "FLW-456" },
      userId: "member-1",
      onPaid: () => events.push("paid-local"),
      refreshPaidProfile: async () => events.push("paid-profile"),
      refreshOwnProfile: async () => events.push("own-profile"),
      refreshProfiles: async () => events.push("feed"),
    })).rejects.toBe(expectedError);
    expect(events).toEqual([]);
  });

  it("reports when the SDK cannot explicitly close checkout", async () => {
    const events: string[] = [];
    const client = { rpc: async () => ({ error: null }) };

    const result = await completeVerifiedPayment({
      client,
      rpcArgs: { tx_ref: "RD-123", flw_ref_id: "FLW-456" },
      userId: "member-1",
      onPaid: () => undefined,
      refreshPaidProfile: async () => undefined,
      refreshOwnProfile: async () => undefined,
      refreshProfiles: async () => undefined,
      checkout: {},
      onCheckoutCloseUnavailable: () => events.push("fallback"),
    });

    expect(result.checkoutClosed).toBe(false);
    expect(events).toEqual(["fallback"]);
  });
});
