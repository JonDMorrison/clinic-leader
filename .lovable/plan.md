

## Plan: Enhanced Sign Up Flow with Company + EMR Capture

### What Changes

1. **CTA buttons**: Change "Get Started" links in HeroSection and NavPublic from `#contact` back to `/auth`. The nav "Get Started" and hero CTA both route to `/auth`.

2. **Auth page redesign** -- Sign Up mode gets additional fields:
   - **Email** (existing)
   - **Password** (existing)
   - **Full Name** (new, required)
   - **Clinic / Practice Name** (new, required)
   - **EMR System** (new, dropdown: Jane, ChiroTouch, Notero, Other, None)
   - Sign In mode stays unchanged (email + password only)

3. **UX details**:
   - Sign Up form title: "Get Started with ClinicLeader"
   - Subtitle: "Create your account and tell us about your practice"
   - Fields are grouped logically: account info (name, email, password) then practice info (clinic name, EMR)
   - EMR dropdown uses a Select component with the same options already defined in validators (`Jane`, `ChiroTouch`, `Notero`, `None`, `Other`)
   - When "Other" is selected, show a text input for the EMR name
   - All new fields are captured in Supabase auth metadata (`user_metadata`) on signup so they flow into the onboarding session without extra DB calls at signup time
   - After signup, user is redirected to `/` which hits the onboarding guard as normal -- the onboarding wizard can pre-populate company name and EMR from user metadata

4. **Implementation approach**:
   - Modify `Auth.tsx` to add the new fields in Sign Up mode only
   - Pass metadata via `supabase.auth.signUp({ data: { full_name, clinic_name, emr_system } })`
   - Update the `onboarding-save-draft` edge function (or the Onboarding page) to read `user_metadata` and pre-fill the wizard's company name and EMR fields
   - No new database tables needed -- metadata lives in auth user_metadata and flows into existing onboarding tables

5. **Revert CTA links**:
   - `HeroSection.tsx`: `<a href="#contact">` → `<Link to="/auth">`
   - `NavPublic.tsx`: both desktop and mobile `<a href="#contact">` → `<Link to="/auth">`

### Files to modify
- `src/pages/Auth.tsx` -- add signup fields, pass metadata
- `src/components/landing/HeroSection.tsx` -- CTA links to `/auth`
- `src/components/layout/NavPublic.tsx` -- CTA links to `/auth`
- `src/pages/Onboarding.tsx` -- read user_metadata to pre-fill wizard data

