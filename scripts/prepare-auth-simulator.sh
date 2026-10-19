#!/bin/sh
# Owner-approved isolated trust only. Never target 'booted' or an existing device.
set -eu
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ca="$root/../work/private-staging-local/ca.crt"
expected='09:F1:2C:4A:5F:B8:98:3A:38:9F:05:7F:D9:D1:34:B1:A0:CD:A0:AE:7C:A9:35:54:17:A2:16:B3:09:94:C9:10'
actual=$(openssl x509 -in "$ca" -noout -sha256 -fingerprint | cut -d= -f2)
[ "$actual" = "$expected" ] || { echo 'CA fingerprint mismatch; nothing changed.' >&2; exit 1; }
openssl verify -CAfile "$ca" "$ca"
# Probe before mutation; a restricted session must stop here.
xcrun simctl list runtimes >/dev/null
device=$(xcrun simctl create "Bubble Auth Test $(date +%Y%m%d-%H%M%S)" com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro com.apple.CoreSimulator.SimRuntime.iOS-26-5)
printf 'Created dedicated test Simulator: %s\n' "$device"
xcrun simctl boot "$device"
xcrun simctl bootstatus "$device" -b
xcrun simctl keychain "$device" add-root-cert "$ca"
printf '\nTrusted the verified public CA in this test Simulator only: %s\n' "$device"
printf 'Keep this UUID. After testing, remove only this disposable Simulator with:\n'
printf 'xcrun simctl shutdown %s\nxcrun simctl delete %s\n' "$device" "$device"
printf 'No macOS keychain or existing Simulator was modified. No application data was copied.\n'
