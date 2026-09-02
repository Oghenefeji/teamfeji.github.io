import { describe, expect, it } from "vitest";
import { completePaymentUnlock } from "../client/src/lib/payment-callback";

describe("post-payment unlock lifecycle", () => {
  it("confirms RPC, unlocks local state, closes checkout, and refreshes the paid feed", async () => {
    const events: string[] = [];
    let paid = false;
    const client = {
      rpc: async (name: string, args: Record<string, string>) => {
        events.push(`${name}:${args.tx_ref}:${args.flw_ref_id}`);
        return { error: null };
      },
    };

    const result = await completePaymentUnlock({
      client,
      txRef: "RD-123",
      flwRefId: "FLW-456",
      checkout: { close: () => events.push("close") },
      onPaid: () => { paid = true; events.push("paid-local"); },
      refreshFeed: async () => events.push("paid-feed-refresh"),
      onCheckoutCloseUnavailable: () => events.push("close-fallback"),
    });

    expect(result).toEqual({ confirmed: true, checkoutClosed: true });
    expect(paid).toBe(true);
    expect(events).toEqual(["confirm_user_payment:RD-123:FLW-456", "paid-local", "close", "paid-feed-refresh"]);
  });

  it("keeps the paid state confirmed and reports a close fallback when the SDK lacks close", async () => {
    const events: string[] = [];
    let paid = false;
    const client = { rpc: async () => ({ error: null }) };

    const result = await completePaymentUnlock({
      client,
      txRef: "RD-789",
      flwRefId: "FLW-999",
      checkout: {},
      onPaid: () => { paid = true; events.push("paid-local"); },
      refreshFeed: async () => events.push("paid-feed-refresh"),
      onCheckoutCloseUnavailable: () => events.push("close-fallback"),
    });

    expect(result).toEqual({ confirmed: true, checkoutClosed: false });
    expect(paid).toBe(true);
    expect(events).toEqual(["paid-local", "close-fallback", "paid-feed-refresh"]);
  });
});
