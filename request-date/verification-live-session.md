# Live verification notes

- Published Request Date app is reachable at `https://reqdate-jqshfk5e.manus.space/`.
- Browser session is authenticated; the page shows `Free member`, `My Account`, and `Sign out`.
- Supabase auth storage key is present: `sb-saxkpuzjjsxkjmprezyw-auth-token`.
- No payment checkout was opened and no charge was initiated during this verification.

The next probe will call the Supabase `confirm_user_payment` RPC with a deliberately nonexistent smoke-test transaction reference, expecting the authoritative claim validation to reject it without changing payment state.

## Smoke result

The authenticated, non-charging call to `confirm_user_payment(text,text)` using `RD-LIVE-SMOKE-NONPAYMENT` and `FLW-LIVE-SMOKE-NONPAYMENT` returned HTTP `200` with body `true`. The probe did not initiate a payment, but this response does **not** match the current `supabase/schema.sql` contract, which should return a JSON success object only after a verified, non-expired `payment_claims` row exists and should reject this nonexistent claim. Treat this as evidence that the live RPC definition is still an older/different version or that the latest migration has not applied to the active Supabase project. Do not treat the live schema as verified until the SQL is reapplied and the probe returns the expected claim-validation rejection.

A second authenticated probe with empty `tx_ref` and `flw_ref_id` also returned HTTP `200` with body `true`, again without initiating checkout or creating a payment. This confirms the deployed RPC is not enforcing the validation shown in the repository's latest schema and requires reapplication in the active Supabase SQL Editor before production use.

## Post-reapplication smoke result

After the user reapplied the complete schema, the authenticated non-charging probes behaved as expected. A nonexistent payment claim returned HTTP `403` with `Payment verification claim is missing or expired`, and empty references returned HTTP `400` with `Transaction reference is required`. No payment checkout was opened and no payment was initiated. The live `confirm_user_payment` validation path is now verified.
