#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${1:-"$ROOT_DIR/assets/gif"}"
OUTPUT_GIF="${2:-"$SOURCE_DIR/build-keyword.gif"}"

WIDTH="${WIDTH:-1280}"
HEIGHT="${HEIGHT:-720}"
FIT_WIDTH="${FIT_WIDTH:-1216}"
FIT_HEIGHT="${FIT_HEIGHT:-684}"
FRAME_RATE="${FRAME_RATE:-10}"
PAD_COLOR="${PAD_COLOR:-white}"
CARD_WIDTH="${CARD_WIDTH:-760}"
CARD_HEIGHT="${CARD_HEIGHT:-132}"
CARD_CENTER_OFFSET="${CARD_CENTER_OFFSET:-0}"
LEAD_TEXT="${LEAD_TEXT:-I build\\:}"
LEAD_FONT_FILE="${LEAD_FONT_FILE:-/System/Library/Fonts/Supplemental/Arial Bold.ttf}"
LEAD_SIZE="${LEAD_SIZE:-30}"
LEAD_BORDER_WIDTH="${LEAD_BORDER_WIDTH:-1.8}"
TITLE_FONT_FILE="${TITLE_FONT_FILE:-/System/Library/Fonts/Supplemental/Georgia Bold.ttf}"
TITLE_SIZE="${TITLE_SIZE:-60}"
TITLE_BORDER_WIDTH="${TITLE_BORDER_WIDTH:-2.1}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required but was not found in PATH." >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_GIF")"

declare -a CLIPS=(
  "distributed|Distributed"
  "telemetry|Telemetry"
  "dashboard|Dashboard"
  "observability|Observability"
  "performance|Performance"
)

ffmpeg_inputs=()
filter_parts=()
concat_inputs=()

for index in "${!CLIPS[@]}"; do
  IFS="|" read -r file_stem label <<< "${CLIPS[$index]}"
  input_path="$SOURCE_DIR/${file_stem}.gif"

  if [[ ! -f "$input_path" ]]; then
    echo "Missing source GIF: $input_path" >&2
    exit 1
  fi

  ffmpeg_inputs+=(-ignore_loop 1 -t 3 -i "$input_path")

  filter_parts+=(
    "[$index:v]fps=${FRAME_RATE},scale=${FIT_WIDTH}:${FIT_HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR},setsar=1,drawbox=x=(iw-${CARD_WIDTH})/2:y=(ih-${CARD_HEIGHT})/2+${CARD_CENTER_OFFSET}:w=${CARD_WIDTH}:h=${CARD_HEIGHT}:color=black@0.26:t=fill,drawbox=x=(iw-${CARD_WIDTH})/2:y=(ih-${CARD_HEIGHT})/2+${CARD_CENTER_OFFSET}:w=${CARD_WIDTH}:h=${CARD_HEIGHT}:color=white@0.14:t=2,drawtext=fontfile='${LEAD_FONT_FILE}':text='${LEAD_TEXT}':fontcolor=white:fontsize=${LEAD_SIZE}:borderw=${LEAD_BORDER_WIDTH}:bordercolor=black@0.68:shadowcolor=black@0.45:shadowx=0:shadowy=4:x=(w-text_w)/2:y=(h-${CARD_HEIGHT})/2+${CARD_CENTER_OFFSET}+20,drawtext=fontfile='${TITLE_FONT_FILE}':text='${label}':fontcolor=white:fontsize=${TITLE_SIZE}:borderw=${TITLE_BORDER_WIDTH}:bordercolor=black@0.62:shadowcolor=black@0.5:shadowx=0:shadowy=7:x=(w-text_w)/2:y=(h-${CARD_HEIGHT})/2+${CARD_CENTER_OFFSET}+48[v$index]"
  )

  concat_inputs+=("[v$index]")
done

filter_complex=""
for part in "${filter_parts[@]}"; do
  filter_complex+="${part};"
done
filter_complex+="$(printf '%s' "${concat_inputs[@]}")concat=n=${#CLIPS[@]}:v=1:a=0,split[gif_base][palette_base];[palette_base]palettegen=stats_mode=diff[palette];[gif_base][palette]paletteuse=dither=bayer:bayer_scale=3[outv]"

ffmpeg -loglevel error -y "${ffmpeg_inputs[@]}" \
  -filter_complex "$filter_complex" \
  -map "[outv]" \
  -loop 0 \
  "$OUTPUT_GIF"

echo "Created $OUTPUT_GIF"
