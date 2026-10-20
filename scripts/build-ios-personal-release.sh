#!/bin/sh
set -eu

# Build only: preserve the existing team, provisioning, app installation and data.
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo"
test -f ios/Bubble.xcworkspace/contents.xcworkspacedata || {
  echo 'Existing iOS workspace required; nothing generated.' >&2; exit 1;
}
: "${EXPO_PUBLIC_API_URL:?Set the approved, reachable private HTTPS origin first}"
node -e 'const u=new URL(process.env.EXPO_PUBLIC_API_URL); if(u.protocol!=="https:" || u.username || u.password || u.pathname!=="/" || u.search || u.hash) process.exit(1)' || {
  echo 'Use an HTTPS origin without credentials, path, query or fragment.' >&2; exit 1;
}
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
export EXPO_PUBLIC_API_URL
export EXPO_PUBLIC_PRIVATE_BETA_ACCESS=1
export FORCE_BUNDLING=1
# Expo skips the usual native reset-cache in CI mode; stale transforms can omit
# public configuration. Keep the embedded-origin check below as a hard failure.
unset CI SKIP_BUNDLING
output="${BUBBLE_PERSONAL_BUILD_DIR:-$repo/../work/ios-personal-release}"
xcodebuild -workspace ios/Bubble.xcworkspace -scheme Bubble \
  -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath "$output" EXPO_PUBLIC_API_URL="$EXPO_PUBLIC_API_URL" \
  EXPO_PUBLIC_PRIVATE_BETA_ACCESS=1 FORCE_BUNDLING=1 build
app="$output/Build/Products/Release-iphoneos/Bubble.app"
test -s "$app/main.jsbundle" || {
  echo 'Embedded JavaScript missing; do not install.' >&2; exit 1;
}
codesign --verify --deep --strict "$app"
node -e 'const fs=require("node:fs"); if(!fs.readFileSync(process.argv[1]).includes(Buffer.from(process.env.EXPO_PUBLIC_API_URL))) { console.error("Approved HTTPS origin absent from bundle; do not install."); process.exit(1); }' "$app/main.jsbundle"
printf 'Personal iPhone Release app: %s\nSignature and embedded HTTPS origin verified. Nothing installed.\n' "$app"
