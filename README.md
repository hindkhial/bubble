# Bubble mobile interface milestone

An Expo and TypeScript mobile app showing the Home screen and nested Bubble detail screens. It starts with sample content from `src/data/sample.ts`; synthetic local photos in `assets/covers/` are sample covers. Add creates Bubbles, notes, and photos in temporary app state. You can choose a device photo as a Bubble cover or create a Photo item. New content resets when the app restarts; no account or server is connected.

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

Tap a Home Bubble to open it, tap child Bubbles or files to navigate deeper, and use Back or the parent path to return. Add lets you create a Bubble, note, or photo. Search and You are labeled in the shell but become active in later milestones.
