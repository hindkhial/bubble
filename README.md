# Bubble — local and account workspaces

An Expo / React Native / TypeScript notes and lists application, with a Spring Boot/PostgreSQL account backend. This integration lives on `integration`; the original `frontend` and `backend` branches are preserved. See [integration setup, safety rules and test results](INTEGRATION.md).

## Run and check

Use Node.js 22.6+ and run `pnpm install`, then `pnpm web` for browser preview or `pnpm start` for Expo. If file watching reaches platform limits, use `CI=1 pnpm web` and restart after edits.

Checks: `pnpm typecheck`, `pnpm test`, and `pnpm export:mobile`. No lint script is configured.

## Home, search and local storage

Home keeps the personalized welcome and original Bubble grid, with pinned notes/lists using the same existing file cards. Recent Activity and hero quick-create buttons are removed; creation remains in Add. Search works locally across Bubble titles/descriptions, note/photo titles and text, previews, metadata, and checklist items. All/Bubbles/Notes/Lists filters, clear, empty states, pinned-first results, and the original Bubble/file card grid are used. New checklists have an optional Add title control and a compact plus button; completion checkboxes appear only when editing existing lists.

Versioned browser-local storage keys keep content, Bubbles, pins, profile customization, and Appearance mode/accent between refreshes. Storage code lives in `src/storage`; it can be replaced independently of the UI. Failed reads preserve the raw stored value instead of overwriting it; failed writes show an error and retain current session state. In local mode, nothing is sent to a server. Account mode is separately selected and never uploads local content on sign-in. Browser localStorage has size limits and is specific to this browser and origin. Clearing browser data removes it. Native Expo currently uses session state only; persistent storage currently targets the browser.

New browsers begin empty. Existing stored data is not replaced with sample data. New notes/photos/checklists receive creation and modification timestamps; edits and checklist toggles update modification time. Legacy items without timestamps retain stable ordering; historical dates are not invented.

Photos selected in the browser are stored as data URLs. Large photos may exceed localStorage capacity, in which case the saving error is displayed. Permanent native photo storage and an installable offline application shell are future work.

## Account mode

Open **You → Security** or the workspace link to create an account, sign in, resume an existing session, switch workspaces or sign out. Account mode requires the configured backend; local-only mode remains available without it. Copying local notes/lists requires a separate review, selection and explicit copy action. Originals stay local. This is not two-way offline synchronization. Account integration currently targets the browser; native builds retain local session behavior. See [INTEGRATION.md](INTEGRATION.md) before starting the full stack.

## Testing

See [TESTING.md](TESTING.md) for isolated browser tests, full-stack checks and current verification limits.

## Performance

See [PERFORMANCE.md](PERFORMANCE.md) for measured improvements, repeatable synthetic benchmarks and remaining limits.
