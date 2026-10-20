#!/bin/sh
set -eu

# Existing generated workspace only: never regenerate native files or signing.
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo"
test -f ios/Bubble.xcworkspace/contents.xcworkspacedata || {
  echo 'Open/prepare the existing Bubble.xcworkspace first; nothing was generated.' >&2
  exit 1
}
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://localhost:8443}"
# UI flag only. Tester credentials remain entered locally and held in memory.
export EXPO_PUBLIC_PRIVATE_BETA_ACCESS=1
export FORCE_BUNDLING=1
unset SKIP_BUNDLING
output="${BUBBLE_SIMULATOR_BUILD_DIR:-$repo/../work/ios-ux-release}"
xcodebuild -workspace ios/Bubble.xcworkspace -scheme Bubble \
  -configuration Release -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath "$output" \
  CODE_SIGNING_ALLOWED=NO build
app="$output/Build/Products/Release-iphonesimulator/Bubble.app"
test -s "$app/main.jsbundle" || {
  echo 'No embedded main.jsbundle found; standalone verification is blocked.' >&2
  exit 1
}
printf 'Release Simulator app: %s\nEmbedded main.jsbundle is present.\n' "$app"
echo 'Launch, Metro-off behavior and data preservation still require actual Simulator tests.'
