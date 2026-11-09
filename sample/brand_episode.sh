#!/usr/bin/env bash
# Adds an "EP N" badge (whole video) and an "EPISODE N / TITLE" opening card (first 1.6 s).
# usage: sample/brand_episode.sh <in.mp4> <out.mp4> <N> "<TITLE>"
set -e
F="$(dirname "$0")/assets/LuckiestGuy.ttf"; IN=$1; OUT=$2; N=$3; T=$4
A="alpha='if(lt(t,1.2),1,max(0,1-(t-1.2)/0.4))':enable='lt(t,1.6)'"
ffmpeg -v error -y -i "$IN" -vf "\
drawtext=fontfile=$F:text='EP $N':fontsize=58:fontcolor=white:borderw=6:bordercolor=0x0d0d12:box=1:boxcolor=0xd62a2a@0.92:boxborderw=18:x=64:y=230,\
drawtext=fontfile=$F:text='EPISODE $N':fontsize=150:fontcolor=0xffd23f:borderw=14:bordercolor=0x0d0d12:x=(w-text_w)/2:y=360:$A,\
drawtext=fontfile=$F:text='$T':fontsize=96:fontcolor=white:borderw=10:bordercolor=0x0d0d12:x=(w-text_w)/2:y=530:$A" \
  -c:v libx264 -preset slow -crf 25 -maxrate 12M -bufsize 24M -pix_fmt yuv420p -c:a copy -movflags +faststart "$OUT"
echo "wrote $OUT"
