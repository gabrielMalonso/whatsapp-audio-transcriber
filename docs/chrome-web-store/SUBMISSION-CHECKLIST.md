# Submission checklist

## Before using the dashboard

- [ ] Create or choose a Google account dedicated to the publisher.
- [ ] Enable two-step verification on that account.
- [ ] Register in the Chrome Web Store Developer Dashboard and pay the one-time fee shown during registration.
- [ ] Set the publisher's public name and verify the email address.
- [ ] Publish `PRIVACY.md` on the `main` branch so the URL is public.
- [ ] Confirm that the manifest, root `package.json`, and extension package versions match.
- [ ] Run `pnpm check` and `pnpm store:package`.

## Create the item

- [ ] Open the Developer Dashboard and select **Add new item**.
- [ ] Upload `release/WhatsApp-Transcritor-vX.Y.Z.zip`.
- [ ] Check the permissions notice calculated by the store.
- [ ] Fill in the **Store listing** tab with `LISTING-EN.md` for the English locale and files from `assets/`. `LISTING-PT-BR.md` is now an English translation of the original listing, not Portuguese publishing copy.
- [ ] Fill in the **Privacy** tab with `PRIVACY-DISCLOSURES.md`.
- [ ] Fill in **Test instructions** with `REVIEW-INSTRUCTIONS.md`.
- [ ] Under **Distribution**, choose **Public**, all desired regions, and free distribution.
- [ ] Use deferred publishing if you want to review the approval before making the item public.
- [ ] Submit for review.

## After approval

- [ ] Publish the item if publication was deferred.
- [ ] Save the definitive extension ID and store URL in the project documentation.
- [ ] Update the README with the **Add to Chrome** button.
- [ ] Keep the ZIP and checksum of the published version.
- [ ] Monitor publisher emails and dashboard status.

## For each update

- [ ] Update code and tests.
- [ ] Increment the version everywhere with `pnpm version:extension X.Y.Z`.
- [ ] Review the policy and disclosures if permissions or data processing change.
- [ ] Run `pnpm check`.
- [ ] Generate the ZIP with `pnpm store:package`.
- [ ] In the existing item, open **Package → Upload new package**.
- [ ] Upload the new ZIP and review the dashboard changes.
- [ ] Submit for review; never create another item for a normal update.

## Steps that still depend on the publisher

- Google account and registration fee;
- Publisher's public name and email address;
- Acceptance of legal declarations in the dashboard;
- A temporary review credential, if requested;
- Final clicks on **Submit for review** and **Publish**.
