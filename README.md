# Bubble frontend

An Expo / React Native / TypeScript personal notes and lists interface. Frontend development targets the `frontend` branch; backend development is separate.

## Run and check

Use Node.js 22.6+ and run `pnpm install`, then `pnpm web` for browser preview or `pnpm start` for Expo. If file watching reaches platform limits, use `CI=1 pnpm web` and restart after edits.

Checks: `pnpm typecheck`, `pnpm test`, and `pnpm export:mobile`. No lint script is configured.

## Milestone 08

Home keeps the personalized welcome and original Bubble grid, with pinned notes/lists using the same existing file cards. Recent Activity and hero quick-create buttons are removed; creation remains in Add. Search works locally across Bubble titles/descriptions, note/photo titles and text, previews, metadata, and checklist items. All/Bubbles/Notes/Lists filters, clear, empty states, pinned-first results, and the original Bubble/file card grid are used. New checklists have an optional Add title control and a compact plus button; completion checkboxes appear only when editing existing lists.

Versioned browser-local storage keys keep content, Bubbles, pins, profile customization, and Appearance mode/accent between refreshes. Storage code lives in `src/storage`; it can be replaced independently of the UI. Failed reads preserve the raw stored value instead of overwriting it; failed writes show an error and retain current session state. Nothing is sent to a server. Browser localStorage has size limits and is specific to this browser and origin. Clearing browser data removes it. Native Expo currently uses session state only; browser persistence is the scope of this milestone.

New browsers begin empty. Existing stored data is not replaced with sample data. New notes/photos/checklists receive creation and modification timestamps; edits and checklist toggles update modification time. Legacy items without timestamps retain stable ordering; historical dates are not invented.

Photos selected in the browser are stored as data URLs. Large photos may exceed localStorage capacity, in which case the saving error is displayed. Permanent native photo storage and an installable offline application shell are future work.
