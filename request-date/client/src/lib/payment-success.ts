export const PAYMENT_SUCCESS_MESSAGE = "Payment verified. WhatsApp access unlocked for life.";

export function shouldCelebratePayment(status: string | undefined, verified: boolean) {
  return verified && (status === "successful" || status === "completed");
}

export type PaymentSuccessLifecycle = {
  status?: string;
  verified: boolean;
  checkoutClosed: boolean;
  alreadyCelebrated: boolean;
};

export function canCelebrateAfterCheckoutClose({ status, verified, checkoutClosed, alreadyCelebrated }: PaymentSuccessLifecycle) {
  return !alreadyCelebrated && checkoutClosed && shouldCelebratePayment(status, verified);
}
