#!/usr/bin/env bash
# Regenerates build/icon.png (1024) and build/icon.icns from design/brand/app-icon.svg. macOS tools only for the .icns step.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
svg="$root/design/brand/app-icon.svg"
png="$root/build/icon.png"
iconset="$(mktemp -d)/icon.iconset"
trap 'rm -rf "$(dirname "$iconset")"' EXIT

mkdir -p "$root/build" "$iconset"
rsvg-convert -w 1024 -h 1024 "$svg" -o "$png"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$png" --out "$iconset/icon_${size}x${size}.png" >/dev/null
  sips -z "$((size * 2))" "$((size * 2))" "$png" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$iconset" -o "$root/build/icon.icns"
