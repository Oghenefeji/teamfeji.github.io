# Live Payment Security Verification

Date: 2026-08-31

The signed-in test account was used to verify the applied Supabase policies without leaving test data behind.

The authenticated browser attempt to update its own `profiles.has_paid` from `false` to `true` returned HTTP 403 and the stored value remained `false`.

The authenticated browser attempt to insert a successful payment row returned HTTP 403 with a Supabase row-level-security error. No row was created.

The `payments?select=flw_ref` compatibility query returned HTTP 200, confirming the gateway-reference column is live.

The authenticated `/api/payments/verify` endpoint was reachable and returned a structured HTTP 402 response for an intentionally invalid transaction id. No charge or payment row was created. A real successful transaction is required to prove the positive persistence path end-to-end, but the server verification route is available and the browser-side authoritative writes are blocked.
