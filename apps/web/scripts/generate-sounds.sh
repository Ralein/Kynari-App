#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# Generate realistic whale.mp3 and piano.mp3 for the Kynari Sleep Soundscape
# Requires: ffmpeg with lavfi support
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SOUNDS_DIR="$(cd "$(dirname "$0")/../public/sounds" && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

WHALE_DUR=29
PIANO_DUR=28

echo "🐋 Generating soothing whale sounds (under 30s)..."

# ─── WHALE ────────────────────────────────────────────────────────────────────

# Layer 1: Deep underwater rumble (low sine + slow modulation)
ffmpeg -y -f lavfi \
  -i "sine=frequency=30:duration=${WHALE_DUR}" \
  -af "volume=0.03,tremolo=f=0.1:d=0.2,lowpass=f=80" \
  "$TMP_DIR/w_rumble.wav" 2>/dev/null
echo "  ✓ deep rumble layer"

# Layer 2: Hydrophone ambience (filtered noise + slow pressure changes)
ffmpeg -y -f lavfi \
  -i "anoisesrc=color=brown:duration=${WHALE_DUR}:amplitude=0.004:seed=42" \
  -af "lowpass=f=100:p=2,highpass=f=10,tremolo=f=0.1:d=0.3" \
  "$TMP_DIR/w_ambience.wav" 2>/dev/null
echo "  ✓ hydrophone ambience"

# Whale calls - 3 realistic variations using frequency modulation (aevalsrc)
# Call 1: Deep rising moan (45Hz -> 65Hz), 8s
ffmpeg -y -f lavfi \
  -i "aevalsrc='sin(2*PI*(45*t + 1.25*t*t))':duration=8" \
  -af "
    vibrato=f=3:d=0.15,
    tremolo=f=0.5:d=0.3,
    lowpass=f=300,
    volume=0.12,
    aecho=0.8:0.8:800|1500:0.3|0.2,
    afade=t=in:d=3,
    afade=t=out:st=5:d=3
  " "$TMP_DIR/w_call1.wav" 2>/dev/null

# Call 2: Long descending "song" (70Hz -> 40Hz), 10s
ffmpeg -y -f lavfi \
  -i "aevalsrc='sin(2*PI*(70*t - 1.5*t*t))':duration=10" \
  -af "
    vibrato=f=2:d=0.25,
    tremolo=f=0.4:d=0.4,
    lowpass=f=250,
    volume=0.14,
    aecho=0.8:0.85:1200|2500:0.4|0.3,
    afade=t=in:d=4,
    afade=t=out:st=6:d=4
  " "$TMP_DIR/w_call2.wav" 2>/dev/null

# Call 3: Low warbling pulse (~55Hz), 7s
ffmpeg -y -f lavfi \
  -i "aevalsrc='sin(2*PI*(55*t + 8*sin(2*PI*0.8*t)))':duration=7" \
  -af "
    vibrato=f=4:d=0.3,
    tremolo=f=0.8:d=0.5,
    lowpass=f=200,
    volume=0.13,
    aecho=0.8:0.8:600|1800:0.35|0.25,
    afade=t=in:d=2.5,
    afade=t=out:st=4:d=3
  " "$TMP_DIR/w_call3.wav" 2>/dev/null

echo "  ✓ realistic whale calls (FM synthesis)"

# Position each call in the 29s timeline
ffmpeg -y -i "$TMP_DIR/w_call1.wav" -af "adelay=2000|2000,apad=whole_dur=${WHALE_DUR}" "$TMP_DIR/w_c1p.wav" 2>/dev/null
ffmpeg -y -i "$TMP_DIR/w_call2.wav" -af "adelay=10000|10000,apad=whole_dur=${WHALE_DUR}" "$TMP_DIR/w_c2p.wav" 2>/dev/null
ffmpeg -y -i "$TMP_DIR/w_call3.wav" -af "adelay=18000|18000,apad=whole_dur=${WHALE_DUR}" "$TMP_DIR/w_c3p.wav" 2>/dev/null
echo "  ✓ calls positioned"

# Final whale mix - strictly lowpassed for underwater effect
ffmpeg -y \
  -i "$TMP_DIR/w_rumble.wav" \
  -i "$TMP_DIR/w_ambience.wav" \
  -i "$TMP_DIR/w_c1p.wav" \
  -i "$TMP_DIR/w_c2p.wav" \
  -i "$TMP_DIR/w_c3p.wav" \
  -filter_complex "
    [0:a][1:a][2:a][3:a][4:a]amix=inputs=5:normalize=0,
    lowpass=f=400,
    highpass=f=20,
    volume=2.5,
    afade=t=in:d=4,
    afade=t=out:st=25:d=4[out]
  " -map "[out]" -t 29 -codec:a libmp3lame -b:a 192k -ar 44100 \
  "$SOUNDS_DIR/whale.mp3" 2>/dev/null

echo "✅ whale.mp3 fixed (${WHALE_DUR}s)"


# ─── PIANO ────────────────────────────────────────────────────────────────────
echo ""
echo "🎹 Generating soothing piano lullaby (under 30s)..."

# Generate a piano note: fundamental + 3 overtones with exponential fade
generate_piano_note() {
  local freq=$1
  local decay=$2
  local amp=$3
  local outfile=$4
  
  local h2=$(echo "$freq * 2.001" | bc -l)
  local h3=$(echo "$freq * 3.003" | bc -l)
  local h4=$(echo "$freq * 4.006" | bc -l)
  
  local d2=$(echo "$decay * 0.70" | bc -l)
  local d3=$(echo "$decay * 0.50" | bc -l)
  local d4=$(echo "$decay * 0.35" | bc -l)
  
  local a2=$(echo "$amp * 0.28" | bc -l)
  local a3=$(echo "$amp * 0.08" | bc -l)
  local a4=$(echo "$amp * 0.03" | bc -l)
  
  ffmpeg -y \
    -f lavfi -i "sine=frequency=${freq}:duration=${decay}" \
    -f lavfi -i "sine=frequency=${h2}:duration=${d2}" \
    -f lavfi -i "sine=frequency=${h3}:duration=${d3}" \
    -f lavfi -i "sine=frequency=${h4}:duration=${d4}" \
    -filter_complex "
      [0:a]volume=${amp},afade=t=in:d=0.012,afade=t=out:d=${decay}[f0];
      [1:a]volume=${a2},afade=t=in:d=0.008,afade=t=out:d=${d2}[f1];
      [2:a]volume=${a3},afade=t=in:d=0.005,afade=t=out:d=${d3}[f2];
      [3:a]volume=${a4},afade=t=in:d=0.003,afade=t=out:d=${d4}[f3];
      [f0][f1][f2][f3]amix=inputs=4:normalize=0[out]
    " -map "[out]" "$outfile" 2>/dev/null
}

# Lullaby melody: freq decay amp delay_ms (Reduced for 28s)
MELODY=(
  "261.63  6.0  0.18  0"     # C4
  "329.63  5.5  0.16  2500"  # E4
  "392.00  6.0  0.14  5000"  # G4
  "329.63  5.0  0.16  7500"  # E4
  "523.25  6.5  0.12  10000" # C5
  "440.00  5.5  0.14  13000" # A4
  "392.00  6.0  0.16  16000" # G4
  "329.63  6.5  0.14  19500" # E4
  "261.63  7.0  0.18  23000" # C4
)

echo "  Generating ${#MELODY[@]} piano notes..."

NOTE_FILES=()
for i in "${!MELODY[@]}"; do
  read -r freq decay amp delay <<< "${MELODY[$i]}"
  outfile="$TMP_DIR/pn_${i}.wav"
  generate_piano_note "$freq" "$decay" "$amp" "$outfile"
  NOTE_FILES+=("$outfile")
done
echo "  ✓ notes generated"

# Position each note in the timeline
echo "  Positioning notes..."
POS_FILES=()
for i in "${!MELODY[@]}"; do
  read -r freq decay amp delay <<< "${MELODY[$i]}"
  posfile="$TMP_DIR/pn_p${i}.wav"
  ffmpeg -y -i "${NOTE_FILES[$i]}" \
    -af "adelay=${delay}|${delay},apad=whole_dur=${PIANO_DUR}" \
    "$posfile" 2>/dev/null
  POS_FILES+=("$posfile")
done
echo "  ✓ notes positioned"

# Mix notes
echo "  Mixing notes..."
inputs=""
labels=""
for i in "${!POS_FILES[@]}"; do
  inputs="$inputs -i ${POS_FILES[$i]}"
  labels="${labels}[${i}:a]"
done

eval ffmpeg -y $inputs \
  -filter_complex "\"${labels}amix=inputs=${#POS_FILES[@]}:normalize=0[out]\"" \
  -map "\"[out]\"" "$TMP_DIR/piano_raw.wav" 2>/dev/null

# Final polish: warm reverb, softer lowpass, normalize
ffmpeg -y -i "$TMP_DIR/piano_raw.wav" \
  -af "
    aecho=0.8:0.6:300|600|900:0.2|0.15|0.1,
    lowpass=f=3500,
    highpass=f=60,
    volume=2.8,
    afade=t=in:d=3,
    afade=t=out:st=23:d=5
  " -t 29 -codec:a libmp3lame -b:a 192k -ar 44100 \
  "$SOUNDS_DIR/piano.mp3" 2>/dev/null

echo "✅ piano.mp3 generated (${PIANO_DUR}s)"



# ─── VERIFY ──────────────────────────────────────────────────────────────────
echo ""
echo "📊 Output files:"
for f in whale.mp3 piano.mp3; do
  size=$(stat -f%z "$SOUNDS_DIR/$f" 2>/dev/null || echo "???")
  dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$SOUNDS_DIR/$f" 2>/dev/null || echo "???")
  echo "  $f: ${size} bytes, ${dur}s"
done
echo ""
echo "🎵 Done!"
