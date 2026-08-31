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

- [ ] Inspect Manus and teamfeji.github.io repository branches and contents
- [ ] Prepare a safe Request Date source export without secrets, node_modules, dist, or build artifacts
- [ ] Push the complete source export to the Manus repository
- [ ] Push the complete source export to teamfeji.github.io
- [ ] Verify both remote branches and repository contents
