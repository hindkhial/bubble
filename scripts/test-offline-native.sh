#!/bin/sh
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output="${BUBBLE_NATIVE_TEST_DIR:-$repo/../work/offline-native-tests}"
mkdir -p "$output/tmp" "$output/modules"
export TMPDIR="$output/tmp"
developer="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
compiler="$developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/swiftc"
sdk="$developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk"
"$compiler" -sdk "$sdk" -module-cache-path "$output/modules" \
  "$repo/modules/bubble-session/ios/OfflinePolicy.swift" \
  "$repo/modules/bubble-session/ios/OfflineCipher.swift" \
  "$repo/tests/OfflineNativeMain.swift" -o "$output/offline-tests"
"$output/offline-tests"
