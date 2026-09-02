# Project TODO

- [x] Establish the Request Date visual system: white and warm yellow palette, elegant typography, responsive layout, and polished interaction states
- [x] Add public profile-feed data model with profile visibility and paid-access fields
- [x] Add payments data model with unique transaction references and persisted successful status
- [x] Implement public profile listing procedure with safe contact-data protection
- [x] Implement authenticated profile onboarding and profile persistence
- [x] Implement required WhatsApp-number validation and normalization
- [x] Implement client-side image compression and a maximum of two profile photos
- [x] Implement Supabase Storage profile-photo uploads with client-side compression and stored image references
- [x] Implement guest locked Connect / View WhatsApp CTA and sign-up prompt modal
- [x] Implement free email/password registration and immediate onboarding flow
- [x] Integrate Flutterwave Inline checkout for the ₦1,500 NGN lifetime-access fee
- [x] Persist successful payment records and paid-access status
- [x] Unlock all profile contact CTAs for paid members
- [x] Generate prefilled WhatsApp chat links with normalized phone numbers
- [x] Add loading, empty, error, and success states across the primary flows
- [x] Add unit tests for profile access rules, payment persistence, and WhatsApp-link behavior
- [x] Run type checks, tests, and production build verification
- [x] Perform responsive visual verification on desktop and mobile layouts
- [x] Resolve verification findings and prepare the final project checkpoint

- [x] Add robust Nigerian WhatsApp validation and normalization with user-facing form errors
- [x] Make signup/onboarding reliable when the returned auth session is delayed or absent
- [x] Add a trusted server-side Flutterwave verification step before persisting paid access
- [x] Refetch the paid-member profile dataset immediately after successful payment
- [x] Add explicit feed loading, empty, and persistent error UI states
- [x] Add and run tests for privacy access rules, payment persistence, and WhatsApp helpers

- [x] Prevent duplicate signup/profile submissions with form prevention and loading-state button locking
- [x] Fall back from an existing-user signup error to password sign-in
- [x] Use duplicate-safe profile upsert with the user id conflict key
- [x] Add regression coverage for the signup fallback and profile upsert behavior
- [x] Re-run type checks, tests, build, and runtime verification
- [x] Add a mocked auth-flow test proving an existing-user signup error invokes password sign-in
- [x] Add a profile-save regression test proving `profiles.upsert` receives `{ onConflict: "id" }`
- [x] Run and confirm the expanded regression tests in Vitest output

- [x] Replace the current palette with a pure-white, light-green, dark-slate visual theme
- [x] Remove all mock/demo profiles and preview-card fallbacks
- [x] Fetch the public feed directly from live Supabase profiles ordered by creation time
- [x] Render a clean no-live-profiles state with the requested copy
- [x] Fix one- and two-photo rendering with consistent rounded aspect ratios and conditional carousel dots
- [x] Add live-feed refresh after profile registration and profile edits
- [x] Add logged-in My Account/Profile Settings navigation
- [x] Add editable profile settings for personal details, WhatsApp number, and replacement photos
- [x] Add confirmed profile deletion, Supabase sign-out, and immediate feed refresh
- [x] Preserve automatic signup login, onboarding, id-conflict upsert, and paid unlock across live cards
- [x] Add regression coverage for mock-data removal, live profile queries, account updates/deletion, and image rendering rules
- [x] Run type checks, tests, production build, and responsive visual verification

- [x] Add animated skeleton cards while live Supabase profiles load
- [x] Confirm success toast feedback after profile updates
- [x] Run regression checks, build, and responsive preview verification
- [x] Verify skeleton-loading layout at a mobile/narrow viewport after the latest UI change

- [x] Inspect Manus and teamfeji.github.io repository branches and contents
- [x] Prepare a safe Request Date source export without secrets, node_modules, dist, or build artifacts
- [x] Push the complete source export to the Manus repository
- [x] Push the complete source export to teamfeji.github.io
- [x] Verify both remote branches and repository contents

- [x] Add root-level vercel.json with the frontend build output and SPA route rewrites
- [x] Validate the Vercel configuration against the production build and route setup
- [x] Push vercel.json to the Manus repository
- [x] Push vercel.json to teamfeji.github.io
- [x] Verify both remote commits contain the Vercel configuration

- [x] Fix Flutterwave successful/completed callback to persist `profiles.has_paid` immediately
- [x] Record successful payment transactions with a stable reference and ₦1,500 amount
- [x] Update local paid profile state and refresh all live profiles after payment success
- [x] Hydrate the signed-in user profile and paid status on initial load and auth changes
- [x] Prevent the payment modal from opening for persisted paid members
- [x] Add support email banner/footer and payment-modal mailto help
- [x] Add Contact Support link to the top navigation
- [x] Preserve the white/light-green theme
- [x] Add payment callback and persistence regression tests
- [x] Run type checks, tests, production build, and responsive verification
- [x] Lock down Supabase RLS so clients cannot directly set `profiles.has_paid` or insert authoritative successful payment records
- [x] Keep instant unlock UX based on verified server success and local state refresh
- [x] Add an owned pre-checkout payment-help dialog with a support mailto link
- [x] Apply the hardened payment RLS and `flw_ref` schema migration to the live Supabase project and verify browser writes are rejected
- [x] Make the payment RLS migration remove unknown legacy profile/payment policies idempotently
- [x] Reapply the hardened policy migration and rerun authenticated profile and payment write probes

- [x] Add a celebratory success animation that starts only after verified payment and modal close
- [x] Show an immediate payment-success toast after trusted verification
- [x] Respect reduced-motion preferences for the celebration
- [x] Add regression coverage for the post-payment success state
- [x] Run type checks, tests, production build, and desktop/mobile visual verification
- [x] Extract the verified-and-closed celebration gate used by the payment callback lifecycle
- [x] Test that the celebration gate waits for checkout close and cannot fire twice for one payment
- [x] Re-run the full regression suite and visual verification after lifecycle coverage
- [x] Switch the profile feed to `get_paid_profiles` for paid users and `public_profiles` for unpaid users
- [x] Update the Flutterwave callback to set local `has_paid`, close checkout, and trigger a complete feed refresh after RPC success
- [x] Add regression coverage for paid/unpaid feed query selection and post-payment feed refresh
- [x] Re-run type checks, tests, and production build after the payment unlock fix
- [x] Push and verify the updated implementation in both connected GitHub repositories
- [ ] Push the current post-payment unlock and paid-feed switching changes to both connected GitHub repositories
- [ ] Verify both remote repositories contain the updated feed helper, payment callback helper, Home page, and payment regression tests
