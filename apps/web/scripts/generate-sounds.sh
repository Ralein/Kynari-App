#!/bin/bash
# Generate high-quality whale and piano audio files using ffmpeg synthesis
# Designed for a baby sleep soundscape app
set -e

SOUNDS_DIR="$(cd "$(dirname "$0")/../public/sounds" && pwd)"
echo "Output directory: ${SOUNDS_DIR}"

WHALE_DUR=60
PIANO_DUR=60

# ─── WHALE SONG ───────────────────────────────────────────────────────────────
echo ""
echo "=== Generating whale.mp3 ==="

# Deep ocean ambience + whale-like frequency sweeps with FM modulation
# Layer 1: Brown noise ocean bed, heavy LP filter
# Layer 2: Primary whale call ~100Hz with slow tremolo + vibrato
# Layer 3: Higher harmonic ~180Hz
# Layer 4: Deep sub-bass drone ~50Hz

ffmpeg -y -loglevel warning \
  -f lavfi -i "anoisesrc=duration=${WHALE_DUR}:color=brown:amplitude=0.04,lowpass=f=100,lowpass=f=80" \
  -f lavfi -i "sine=frequency=100:duration=${WHALE_DUR},tremolo=f=0.1:d=0.7,vibrato=f=0.1:d=0.8" \
  -f lavfi -i "sine=frequency=180:duration=${WHALE_DUR},tremolo=f=0.15:d=0.5,vibrato=f=0.12:d=0.6" \
  -f lavfi -i "sine=frequency=50:duration=${WHALE_DUR},tremolo=f=0.1:d=0.3" \
  -filter_complex "\
    [0]volume=0.30[ocean]; \
    [1]volume=0.20[call1]; \
    [2]volume=0.10[call2]; \
    [3]volume=0.15[sub]; \
    [ocean][call1][call2][sub]amix=inputs=4:duration=longest:normalize=0, \
    lowpass=f=500, \
    aecho=0.6:0.5:800|1200:0.2|0.12, \
    afade=t=in:st=0:d=3, \
    afade=t=out:st=57:d=3, \
    volume=2.0 \
  " \
  -codec:a libmp3lame -b:a 192k -ar 44100 \
  "${SOUNDS_DIR}/whale.mp3"

echo "✓ whale.mp3 generated (${WHALE_DUR}s)"

# ─── PIANO LULLABY ────────────────────────────────────────────────────────────
echo ""
echo "=== Generating piano.mp3 ==="

# Step 1: Generate individual note WAV files with proper decay
TMPDIR=$(mktemp -d)
trap "rm -rf ${TMPDIR}" EXIT

# Pentatonic scale frequencies
declare -a NOTES=(261.63 293.66 329.63 392.00 440.00 523.25)
declare -a NAMES=(C4 D4 E4 G4 A4 C5)

for i in "${!NOTES[@]}"; do
  freq=${NOTES[$i]}
  name=${NAMES[$i]}
  # Each note: fundamental + 2nd harmonic at half vol + 3rd harmonic at quarter vol
  # with soft attack and natural exponential decay over ~5s
  ffmpeg -y -loglevel error \
    -f lavfi -i "sine=frequency=${freq}:duration=6" \
    -f lavfi -i "sine=frequency=$((${freq%.*} * 2)):duration=6" \
    -f lavfi -i "sine=frequency=$((${freq%.*} * 3)):duration=6" \
    -filter_complex "\
      [0]volume=0.20[f1]; \
      [1]volume=0.08[f2]; \
      [2]volume=0.03[f3]; \
      [f1][f2][f3]amix=inputs=3:normalize=0, \
      afade=t=in:d=0.015, \
      afade=t=out:st=0.4:d=5.6 \
    " \
    -ar 44100 "${TMPDIR}/${name}.wav"
done

echo "  Notes generated..."

# Step 2: Lullaby pattern - gentle descending/ascending pentatonic
# C4 ... E4 ... G4 ... A4 ... G4 ... E4 ... D4 ... C4 ... C5 ... A4 ... D4 ... E4
# Each note ~5s apart with overlap from reverb tails
# Total arrangement: 12 notes × 5s spacing = 60s

# Build the arrangement using concat with silence pads
# Create a 5.5s silence pad
ffmpeg -y -loglevel error \
  -f lavfi -i "anullsrc=r=44100:cl=mono,atrim=duration=5.5" \
  -ar 44100 "${TMPDIR}/pad.wav"

# Build full sequence by concatenating note+silence pairs
# Pattern indices: C4=0, E4=2, G4=3, A4=4, G4=3, E4=2, D4=1, C4=0, C5=5, A4=4, D4=1, E4=2
PATTERN="C4 E4 G4 A4 G4 E4 D4 C4 C5 A4 D4 E4"
CONCAT_INPUT=""
FILTER=""
IDX=0
for note in $PATTERN; do
  CONCAT_INPUT="${CONCAT_INPUT} -i ${TMPDIR}/${note}.wav -i ${TMPDIR}/pad.wav"
  IDX=$((IDX + 1))
done

# Use a simpler approach: adelay each note from a single input
# Generate each note directly in the final mix
ffmpeg -y -loglevel warning \
  -i "${TMPDIR}/C4.wav" \
  -i "${TMPDIR}/E4.wav" \
  -i "${TMPDIR}/G4.wav" \
  -i "${TMPDIR}/A4.wav" \
  -i "${TMPDIR}/D4.wav" \
  -i "${TMPDIR}/C5.wav" \
  -filter_complex "\
    [0]adelay=0|0[n0]; \
    [1]adelay=5000|5000[n1]; \
    [2]adelay=10000|10000[n2]; \
    [3]adelay=15000|15000[n3]; \
    [2]adelay=20000|20000[n4]; \
    [1]adelay=25000|25000[n5]; \
    [4]adelay=30000|30000[n6]; \
    [0]adelay=35000|35000[n7]; \
    [5]adelay=40000|40000[n8]; \
    [3]adelay=45000|45000[n9]; \
    [4]adelay=50000|50000[n10]; \
    [1]adelay=55000|55000[n11]; \
    [n0][n1][n2][n3][n4][n5][n6][n7][n8][n9][n10][n11]amix=inputs=12:duration=longest:normalize=0, \
    apad=whole_dur=${PIANO_DUR}, \
    aecho=0.8:0.6:350|650|1000:0.28|0.18|0.08, \
    lowpass=f=3000, \
    highpass=f=80, \
    volume=3.0, \
    afade=t=in:st=0:d=2, \
    afade=t=out:st=57:d=3 \
  " \
  -codec:a libmp3lame -b:a 192k -ar 44100 \
  "${SOUNDS_DIR}/piano.mp3"

echo "✓ piano.mp3 generated (${PIANO_DUR}s)"

echo ""
echo "=== Results ==="
ls -lh "${SOUNDS_DIR}/whale.mp3" "${SOUNDS_DIR}/piano.mp3"
echo ""
echo "=== Verification ==="
file "${SOUNDS_DIR}/whale.mp3" "${SOUNDS_DIR}/piano.mp3"
echo ""
ffprobe -hide_banner -i "${SOUNDS_DIR}/whale.mp3" 2>&1 | grep -E "Duration|Audio"
echo "---"
ffprobe -hide_banner -i "${SOUNDS_DIR}/piano.mp3" 2>&1 | grep -E "Duration|Audio"
