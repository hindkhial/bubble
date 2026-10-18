# iPhone accounts and library

## Authentication and privacy

iOS starts at Welcome, Log In or Create Account until the existing Spring session
has been verified online. Protected routes and their content providers mount only
after verification. Registration uses the existing backend; no new authentication
service or credentials in Expo configuration were introduced.

The local Expo `BubbleSession` module uses an ephemeral URLSession, normal TLS
verification and a private cookie jar. Session cookies are stored in the iOS
Keychain with `WhenUnlockedThisDeviceOnly` protection and never returned to
JavaScript. Redirects are rejected. Mutations retain Spring's CSRF token checks.
Startup and return from background verify `/users/me`; the foreground verification
window is limited to 15 minutes. Server expiry and authorization remain decisive.
Logout locks the client before its network request, clears native session storage
and unmounts account content. Browser account/local behavior is retained.

The private staging gateway has a separate tester login. Its credentials are held
only in native memory and must be re-entered after a process restart. Then use
Restore existing session to verify the Keychain-backed Bubble session without
re-entering the Bubble password. This development gate is not account registration.

## Account Bubbles, Photos and Home

New account Bubbles require a cover photo. Existing device Bubbles without covers
remain valid. Notes, checklists and photos default to Home outside any Bubble;
the destination picker can select an existing Bubble or create one. Nested Bubbles
continue to be supported. Card columns have equal widths and image proportions
determine height. The three Bubble shade keys remain compatible with existing data
and render using the current light/dark accent.

`/api/v1/library` stores account-owned Bubbles and Photos in PostgreSQL. Images
are read through authenticated `/library/{id}/image` JSON requests using the same
session transport; there are no public image URLs or embedded credentials. Metadata
lists are paginated and contain no image bytes. The client keeps account images in
memory, scoped to the mounted account screens.

Image input is bounded to 512 KiB after client compression, JPEG/PNG only, and
16 million pixels. The backend validates the decoder and dimensions, strips image
metadata by JPEG re-encoding, and caps stored output at 512 KiB. Transparent areas
become white. Storage is capped at 500 image entries and 100 MiB per account.
Oversized or unsupported images are rejected without changing the draft. Image
resizing and larger uploads are future improvements, not silently supported.

New endpoints reuse authentication, CSRF, request limits and safe error handling:

- `GET/POST /library`: paginated metadata/create Bubble or Photo.
- `GET /library/placements`: paginated note/list destinations.
- `GET /library/{id}/image`: private image read.
- `PATCH /library/{id}`: title, description and shade.
- `PUT /library/{id}/pin`: pin/unpin.
- `DELETE /library/{id}`: explicit removal. Deleting an account Bubble moves its
  children to Home and removes placements; it never deletes its notes or lists.
- `POST /library/notes` and `/library/checklists`: atomically create the content
  and its optional destination. Original note/list APIs remain supported.

V3 is additive. Existing account notes/lists with no placement appear on Home.
Existing users, profiles, preferences and content rows are not rewritten. Images
live in the existing database volume and are included in PostgreSQL backups; no
external storage, paid infrastructure or new dependencies were introduced.

“Sync” means saves are confirmed by the private account backend and can be read
by another authenticated session. It does not mean background synchronization,
offline account editing, conflict resolution, or public hosting. Account usage
requires a connection; failed writes retain drafts and uncertain outcomes block
automatic retries. A reachable approved HTTPS endpoint is still needed for future
physical-device use.

## Legacy content and profile assets

All previous SQLite keys remain intact. No login assigns old device content to an
account or uploads it. The review flow first asks whether the device content belongs
to the user, then requires item selection and confirmation of the destination email.
Only selected notes/lists can be copied. New IDs are verified by reading the saved
content back before marking a copy complete. Known IDs can be verified on retry
without another POST. Unknown outcomes require manual reconciliation; originals
are never deleted. Legacy Bubbles/photos are not automatically transferred.

Names/bios and Appearance use existing account APIs. Native profile photos, avatar
emoji and color use account-specific protected native storage, separately from the
unassigned legacy profile. Profile photos are not part of the new content-photo
sync API. Existing unassigned SQLite content is preserved as-is, not retroactively
encrypted. A future secure offline account cache requires a separate design.

## Verification and remaining gates

Actual user-reported checks in the isolated iPhone test Simulator:

| Check | Result |
| --- | --- |
| Native Xcode build and Welcome launch | Passed |
| Staging Safari HTTPS without warning | Passed |
| Registration to Home | Passed |
| Logout, welcome return and login | Passed |
| Restart then gateway access plus session restore without Bubble password | Passed |
| Two synthetic accounts cannot see each other's note | Passed |
| Original test account's note survives switching accounts | Passed |
| All four Add options and standalone note saved on Home in Simulator | Passed |
| New Bubble/Photo creation, tall images and selected Bubble destinations in Simulator | Not Tested |
| Profile/photo customization after new account flow and restart | Not Tested |
| Offline authentication failure and protected deep links | Not Tested |
| Native consent flow, interrupted transfer and reconciliation | Not Tested |
| VoiceOver, Dynamic Type, full focus/zoom and physical iPhone | Not Tested |

Native session testing used the separately approved `Bubble Auth Test` Simulator.
Its development CA trust does not modify either macOS keychain. Retain normal TLS
verification. The setup script prints commands to remove only that disposable
Simulator after testing; never erase the user's original Simulator or app data.

Automated results and final browser outcomes are recorded in TESTING.md. Existing
dependency advisories and manual release gates remain open; these changes do not
constitute release approval. No branch merge, TestFlight submission or public
deployment is authorized by this work.
