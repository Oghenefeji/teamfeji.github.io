export type FlutterwaveCallbackResponse = {
  status?: string;
  tx_ref?: string;
  flw_ref?: string;
  transaction_id?: string | number;
};

export function isSuccessfulFlutterwaveResponse(response: FlutterwaveCallbackResponse) {
  return response.status === "successful" || response.status === "completed";
}

export function paymentTransactionRef(response: FlutterwaveCallbackResponse) {
  return response.tx_ref || `RD-${Date.now()}`;
}
