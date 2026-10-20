# Bubble — personal iPhone edition

Active scope: the owner's iPhone 13 with free Xcode Personal Team signing. See
[personal installation, weekly renewal, backups and current limitations](PERSONAL-IPHONE.md).
TestFlight, App Store, paid membership, public web/hosting and Android distribution
are deferred. Existing browser tooling and release documents are retained for
regression checks and future reference. Native iOS requires online authentication;
it does not currently provide offline account access.

An Expo / React Native / TypeScript notes and lists application, with a Spring Boot/PostgreSQL account backend. This integration lives on `integration`; the original `frontend` and `backend` branches are preserved. See [integration setup, safety rules and test results](INTEGRATION.md).

## Run and check

Use Node.js 22.6+ and run `pnpm install`, then `pnpm web` for browser preview or `pnpm start` for Expo. If file watching reaches platform limits, use `CI=1 pnpm web` and restart after edits.

Checks: `pnpm typecheck`, `pnpm test`, and `pnpm export:mobile`. No lint script is configured.

## Home, search and local storage

Home keeps the personalized welcome and original Bubble grid, with pinned notes/lists using the same existing file cards. Recent Activity and hero quick-create buttons are removed; creation remains in Add. Search works locally across Bubble titles/descriptions, note/photo titles and text, previews, metadata, and checklist items. All/Bubbles/Notes/Lists filters, clear, empty states, pinned-first results, and the original Bubble/file card grid are used. New checklists have an optional Add title control and a compact plus button; completion checkboxes appear only when editing existing lists.

Versioned browser-local storage keys keep content, Bubbles, pins, profile customization, and Appearance mode/accent between refreshes. Storage code lives in `src/storage`; it can be replaced independently of the UI. Failed reads preserve the raw stored value instead of overwriting it; failed writes show an error and retain current session state. In local mode, nothing is sent to a server. Account mode never uploads local content on sign-in. Browser localStorage is specific to its browser and origin. Native legacy device content uses SQLite; signed-in content uses the backend and is not an offline SQLite account cache.

New browsers begin empty. Existing stored data is not replaced with sample data. New notes/photos/checklists receive creation and modification timestamps; edits and checklist toggles update modification time. Legacy items without timestamps retain stable ordering; historical dates are not invented.

Photos selected in the browser are stored as data URLs and may exceed localStorage capacity. Native profile photos use persistent private app files; account profile metadata uses account/origin-scoped Keychain records. Account Bubble/content photos use PostgreSQL. See PERSONAL-IPHONE.md for backup limitations.

## Account mode

iOS opens Welcome/Login/Signup and requires a verified native session before protected screens mount. Log Out is on You; Change Password is inside Security. Native account mode needs the reachable trusted HTTPS backend at startup and re-verification. Browser local/account workspaces remain supported for regression purposes. Copying legacy notes/lists requires separate selection and explicit consent; originals stay local. This is not offline synchronization. See [native accounts](IOS-ACCOUNTS.md) and [integration setup](INTEGRATION.md).

## Testing

See [TESTING.md](TESTING.md) for isolated browser tests, full-stack checks and current verification limits.

## Performance

See [PERFORMANCE.md](PERFORMANCE.md) for measured improvements, repeatable synthetic benchmarks and remaining limits.

## Private staging preparation

See [STAGING.md](STAGING.md) for loopback-only HTTPS containers, protected configuration, testing, backup/restore and rollback. No public deployment is configured or authorized.

The [controlled local staging record](PRIVATE-STAGING.md) covers the tester password gate, running-service verification, image scans, restart/recovery evidence and the outstanding browser limitation.

The [private beta testing guide](BETA-TESTING.md) provides the manual UX/accessibility matrix, current blockers and tester reporting process.
