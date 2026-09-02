type PaymentClient = {
  rpc: (functionName: "confirm_user_payment", args: { tx_ref: string; flw_ref_id: string }) => any;
};

type CompleteUnlockOptions = {
  client: PaymentClient;
  txRef: string;
  flwRefId: string;
  checkout: unknown;
  onPaid: () => void;
  refreshFeed: () => Promise<void>;
  onCheckoutCloseUnavailable: () => void;
};

export async function confirmUserPayment(client: PaymentClient, txRef: string, flwRefId: string) {
  const { error } = await client.rpc("confirm_user_payment", { tx_ref: txRef, flw_ref_id: flwRefId }) as { error: unknown | null };
  if (error) throw error;
  return { confirmed: true } as const;
}

export function closeFlutterwaveCheckout(checkout: unknown) {
  const close = (checkout as { close?: () => unknown } | null | undefined)?.close;
  if (typeof close !== "function") return false;
  try {
    close();
    return true;
  } catch {
    return false;
  }
}

export async function completePaymentUnlock(options: CompleteUnlockOptions) {
  await confirmUserPayment(options.client, options.txRef, options.flwRefId);
  options.onPaid();
  const checkoutClosed = closeFlutterwaveCheckout(options.checkout);
  if (!checkoutClosed) options.onCheckoutCloseUnavailable();
  await options.refreshFeed();
  return { confirmed: true, checkoutClosed } as const;
}
