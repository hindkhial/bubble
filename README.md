# Bubble mobile interface milestone

An Expo and TypeScript mobile app showing Home, nested Bubbles, files, and a private You screen. It starts with sample content from `src/data/sample.ts`; synthetic local photos in `assets/covers/` are sample covers. Add creates Bubbles, notes, photos, and checklists in temporary app state. You can choose a device photo as a Bubble cover or create a Photo item. Content and profile changes reset when the app restarts; no account or server is connected.

## Run

Use Node.js LTS, then:

```sh
pnpm install
pnpm start
```

Open the project in Expo Go on a compatible Android or iPhone, or use an emulator. Your phone and computer need access to the same development server. The target phone platform has not yet been established.

For a quick browser preview of these screens, run `pnpm web`. If Metro reports a file watcher limit, run `CI=1 pnpm web`; that mode requires a server restart after code changes. The mobile app remains the intended product; review spacing and gestures on a phone later.

## Check

```sh
pnpm typecheck
pnpm export:mobile
```

Tap a Home Bubble to open it, tap child Bubbles or files to navigate deeper, and use Back or the parent path to return. Add lets you create a Bubble, note, photo, or checklist. The Home avatar and You tab open the private demo profile, where you can edit its name and avatar color. Search remains a placeholder.
