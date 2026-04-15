#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${1:-"$ROOT_DIR/assets/keyword-shots-16x9"}"
OUTPUT_GIF="${2:-"$SOURCE_DIR/sample-keyword-shots.gif"}"

WIDTH="${WIDTH:-1280}"
HEIGHT="${HEIGHT:-720}"
FRAME_RATE="${FRAME_RATE:-5}"
CARD_WIDTH="${CARD_WIDTH:-1000}"
CARD_HEIGHT="${CARD_HEIGHT:-190}"
LEAD_TEXT="${LEAD_TEXT:-I build\\:}"
LEAD_FONT_FILE="${LEAD_FONT_FILE:-/System/Library/Fonts/Supplemental/Arial Bold.ttf}"
LEAD_SIZE="${LEAD_SIZE:-36}"
LEAD_BORDER_WIDTH="${LEAD_BORDER_WIDTH:-1.8}"
TITLE_FONT_FILE="${TITLE_FONT_FILE:-/System/Library/Fonts/Supplemental/Georgia Bold.ttf}"
TITLE_SIZE="${TITLE_SIZE:-74}"
TITLE_BORDER_WIDTH="${TITLE_BORDER_WIDTH:-2.2}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required but was not found in PATH." >&2
  exit 1
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_GIF")"

declare -a CATEGORY_MAP=(
  "distributed-services|Distributed Services"
  "telemetry-pipelines|Telemetry Pipelines"
  "production-infrastructure|Production Infrastructure"
  "latency|Low Latency"
  "reliability|Reliability"
  "observability|Observability"
  "performance|Performance"
  "debugging|Debugging"
)

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/keyword-shots-gif.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

frame_index=0

for entry in "${CATEGORY_MAP[@]}"; do
  IFS="|" read -r folder label <<< "$entry"

  if [[ ! -d "$SOURCE_DIR/$folder" ]]; then
    echo "Missing category directory: $SOURCE_DIR/$folder" >&2
    exit 1
  fi

  images=()
  while IFS= read -r image; do
    images+=("$image")
  done < <(
    find "$SOURCE_DIR/$folder" -maxdepth 1 -type f \
      \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) | sort
  )

  if [[ "${#images[@]}" -lt 5 ]]; then
    echo "Category $folder only has ${#images[@]} image(s); at least 5 are required." >&2
    exit 1
  fi

  for image in "${images[@]:0:5}"; do
    printf -v frame_path "%s/frame-%03d.png" "$TMP_DIR" "$frame_index"

    ffmpeg -loglevel error -y -i "$image" \
      -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,drawbox=x=(iw-${CARD_WIDTH})/2:y=(ih-${CARD_HEIGHT})/2:w=${CARD_WIDTH}:h=${CARD_HEIGHT}:color=black@0.5:t=fill,drawbox=x=(iw-${CARD_WIDTH})/2:y=(ih-${CARD_HEIGHT})/2:w=${CARD_WIDTH}:h=${CARD_HEIGHT}:color=white@0.12:t=2,drawtext=fontfile='${LEAD_FONT_FILE}':text='${LEAD_TEXT}':fontcolor=white:fontsize=${LEAD_SIZE}:borderw=${LEAD_BORDER_WIDTH}:bordercolor=black@0.68:shadowcolor=black@0.6:shadowx=0:shadowy=6:x=(w-text_w)/2:y=(h-${CARD_HEIGHT})/2+28,drawtext=fontfile='${TITLE_FONT_FILE}':text='${label}':fontcolor=white:fontsize=${TITLE_SIZE}:borderw=${TITLE_BORDER_WIDTH}:bordercolor=black@0.62:shadowcolor=black@0.58:shadowx=0:shadowy=10:x=(w-text_w)/2:y=(h-${CARD_HEIGHT})/2+72,format=rgb24" \
      -frames:v 1 "$frame_path"

    frame_index=$((frame_index + 1))
  done
done

ffmpeg -loglevel error -y -framerate "$FRAME_RATE" -start_number 0 -i "$TMP_DIR/frame-%03d.png" \
  -vf "palettegen=stats_mode=diff" \
  -frames:v 1 -update 1 \
  "$TMP_DIR/palette.png"

ffmpeg -loglevel error -y -framerate "$FRAME_RATE" -start_number 0 -i "$TMP_DIR/frame-%03d.png" \
  -i "$TMP_DIR/palette.png" \
  -lavfi "paletteuse=dither=bayer:bayer_scale=3" \
  -loop 0 \
  "$OUTPUT_GIF"

echo "Created $OUTPUT_GIF"
