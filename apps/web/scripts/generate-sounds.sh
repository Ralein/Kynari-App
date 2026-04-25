#!/bin/bash
# Generate high-quality whale and piano audio files using ffmpeg synthesis
# These are designed for a baby sleep soundscape app
set -e

SOUNDS_DIR="$(cd "$(dirname "$0")/../public/sounds" && pwd)"
echo "Output directory: ${SOUNDS_DIR}"

# ─── WHALE SONG ───────────────────────────────────────────────────────────────
echo ""
echo "=== Generating whale.mp3 ==="

WHALE_DUR=60

# Layer 1: Deep ocean rumble (brown noise heavily filtered)
# Layer 2: Primary whale call - sine with slow tremolo + vibrato
# Layer 3: Higher harmonic whale call
# Layer 4: Deep sub-bass drone

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

PIANO_DUR=60

# Gentle pentatonic notes with long decay and reverb echo
# C4=261.63, D4=293.66, E4=329.63, G4=392.00, A4=440.00, C5=523.25
ffmpeg -y -loglevel warning \
  -f lavfi -i "sine=frequency=261.63:duration=5,afade=t=in:d=0.02,afade=t=out:st=0.3:d=4.7" \
  -f lavfi -i "sine=frequency=329.63:duration=5,afade=t=in:d=0.02,afade=t=out:st=0.3:d=4.7" \
  -f lavfi -i "sine=frequency=392.00:duration=5,afade=t=in:d=0.02,afade=t=out:st=0.3:d=4.7" \
  -f lavfi -i "sine=frequency=440.00:duration=5,afade=t=in:d=0.02,afade=t=out:st=0.3:d=4.7" \
  -f lavfi -i "sine=frequency=293.66:duration=5,afade=t=in:d=0.02,afade=t=out:st=0.3:d=4.7" \
  -f lavfi -i "sine=frequency=523.25:duration=5,afade=t=in:d=0.02,afade=t=out:st=0.3:d=4.7" \
  -filter_complex "\
    [0]adelay=0|0,volume=0.18[n0]; \
    [1]adelay=5500|5500,volume=0.16[n1]; \
    [2]adelay=11000|11000,volume=0.15[n2]; \
    [3]adelay=16500|16500,volume=0.14[n3]; \
    [4]adelay=27500|27500,volume=0.16[n5]; \
    [5]adelay=38500|38500,volume=0.12[n7]; \
    [0]acopy,adelay=33000|33000,volume=0.17[n6]; \
    [1]acopy,adelay=44000|44000,volume=0.16[n8]; \
    [3]acopy,adelay=49500|49500,volume=0.13[n9]; \
    [4]acopy,adelay=55000|55000,volume=0.15[n10]; \
    [2]acopy,adelay=22000|22000,volume=0.15[n4]; \
    [n0][n1][n2][n3][n4][n5][n6][n7][n8][n9][n10]amix=inputs=11:duration=longest:normalize=0, \
    apad=whole_dur=${PIANO_DUR}, \
    aecho=0.8:0.6:400|700|1100:0.3|0.2|0.1, \
    lowpass=f=3000, \
    highpass=f=80, \
    volume=3.5, \
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
echo "=== Verifying files ==="
ffprobe -hide_banner -i "${SOUNDS_DIR}/whale.mp3" 2>&1 | grep -E "Duration|Audio"
echo "---"
ffprobe -hide_banner -i "${SOUNDS_DIR}/piano.mp3" 2>&1 | grep -E "Duration|Audio"
