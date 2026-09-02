type RpcClient = {
  rpc: (functionName: string, args: Record<string, string>) => any;
};

type ConfirmAndRefreshOptions = {
  client: RpcClient;
  rpcArgs: Record<string, string>;
  userId: string;
  onPaid: () => void;
  refreshPaidProfile: (userId: string) => Promise<void>;
  refreshOwnProfile: (userId: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
  checkout: unknown;
  onCheckoutCloseUnavailable: () => void;
};

export async function confirmPaymentAndRefresh({ client, rpcArgs, userId, onPaid, refreshPaidProfile, refreshOwnProfile, refreshProfiles }: Omit<ConfirmAndRefreshOptions, "checkout" | "onCheckoutCloseUnavailable">) {
  const { error } = await client.rpc("confirm_user_payment", rpcArgs) as { error: unknown | null };
  if (error) throw error;
  onPaid();
  await refreshPaidProfile(userId);
  await refreshOwnProfile(userId);
  await refreshProfiles();
  return { confirmed: true } as const;
}

export async function completeVerifiedPayment(options: ConfirmAndRefreshOptions) {
  await confirmPaymentAndRefresh(options);
  const checkoutClosed = closeFlutterwaveCheckout(options.checkout);
  if (!checkoutClosed) options.onCheckoutCloseUnavailable();
  return { confirmed: true, checkoutClosed } as const;
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
