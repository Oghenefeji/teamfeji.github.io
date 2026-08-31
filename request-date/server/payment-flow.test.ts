import { describe, expect, it } from "vitest";
import { isSuccessfulFlutterwaveResponse, paymentTransactionRef } from "../client/src/lib/payment-flow";

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
});
