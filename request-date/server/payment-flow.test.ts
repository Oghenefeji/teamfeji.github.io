import { describe, expect, it } from "vitest";
import { confirmPaymentRpcArgs, isSuccessfulFlutterwaveResponse, paymentTransactionRef } from "../client/src/lib/payment-flow";

describe("payment flow", () => {
  it("accepts both successful and completed Flutterwave callback states", () => {
    expect(isSuccessfulFlutterwaveResponse({ status: "successful" })).toBe(true);
    expect(isSuccessfulFlutterwaveResponse({ status: "completed" })).toBe(true);
    expect(isSuccessfulFlutterwaveResponse({ status: "cancelled" })).toBe(false);
  });

  it("preserves Flutterwave transaction references and provides a fallback", () => {
    expect(paymentTransactionRef({ tx_ref: "RD-123" })).toBe("RD-123");
    expect(paymentTransactionRef({ tx_ref: "" })).toMatch(/^RD-\d+$/);
  });

  it("builds the authenticated RPC payload from Flutterwave references", () => {
    expect(confirmPaymentRpcArgs({ tx_ref: "RD-123", flw_ref: "FLW-456", transaction_id: 789 })).toEqual({ tx_ref: "RD-123", flw_ref_id: "FLW-456" });
    expect(confirmPaymentRpcArgs({ transaction_id: 789 }, "RD-fallback")).toEqual({ tx_ref: "RD-fallback", flw_ref_id: "789" });
  });
});
