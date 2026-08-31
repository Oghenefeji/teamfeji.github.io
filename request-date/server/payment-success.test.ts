import { describe, expect, it } from "vitest";
import { PAYMENT_SUCCESS_MESSAGE, canCelebrateAfterCheckoutClose, shouldCelebratePayment } from "../client/src/lib/payment-success";

describe("payment success celebration", () => {
  it("only celebrates after a verified successful or completed payment", () => {
    expect(shouldCelebratePayment("successful", true)).toBe(true);
    expect(shouldCelebratePayment("completed", true)).toBe(true);
    expect(shouldCelebratePayment("successful", false)).toBe(false);
    expect(shouldCelebratePayment("cancelled", true)).toBe(false);
  });

  it("waits for checkout close before celebrating", () => {
    const verifiedButOpen = { status: "successful", verified: true, checkoutClosed: false, alreadyCelebrated: false };
    const verifiedAndClosed = { ...verifiedButOpen, checkoutClosed: true };
    expect(canCelebrateAfterCheckoutClose(verifiedButOpen)).toBe(false);
    expect(canCelebrateAfterCheckoutClose(verifiedAndClosed)).toBe(true);
  });

  it("prevents a second celebration for the same payment", () => {
    const completed = { status: "completed", verified: true, checkoutClosed: true, alreadyCelebrated: false };
    expect(canCelebrateAfterCheckoutClose(completed)).toBe(true);
    expect(canCelebrateAfterCheckoutClose({ ...completed, alreadyCelebrated: true })).toBe(false);
  });

  it("uses a clear lifetime-access message", () => {
    expect(PAYMENT_SUCCESS_MESSAGE).toContain("WhatsApp access unlocked for life");
  });
});
