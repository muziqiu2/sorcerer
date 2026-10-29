#!/usr/bin/env bash
# 构建：字体子集 + CSS/JS 压缩。在 Linux 上跑，产物落到仓库根目录，
# 由 GitHub Pages 直接对外（EdgeOne 回源）。
set -euo pipefail

cd "$(dirname "$0")/.."

FONT_SRC="${FONT_SRC:-/opt/fonts}"
mkdir -p fonts js

echo "== 1/4 字体子集 =="
python3 tools/subset-fonts.py "$FONT_SRC"

echo "== 2/4 六号窄体（Six Caps） =="
if [ ! -f fonts/sixcaps-400.woff2 ]; then
  curl -fsSL -m 60 -o fonts/sixcaps-400.woff2 \
    "https://cdn.jsdelivr.net/npm/@fontsource/six-caps/files/six-caps-latin-400-normal.woff2"
fi
printf 'sixcaps-400.woff2  %s KB\n' "$(( $(stat -c%s fonts/sixcaps-400.woff2) / 1024 ))"

echo "== 3/4 CSS =="
npx --yes esbuild@0.25.0 src/main.css --minify --charset=utf8 \
  --target=chrome110,edge110,firefox110,safari16 --outfile=main.css.tmp --log-level=warning
# esbuild 会删注释，把设计戳记补回第一行
STAMP='/* Hallmark · theme: broadside, adapted · critique: P5 H5 E4 S5 R4 V4 · weakest E, one hero rule collapsed to zero width in flex, fixed */'
{ printf '%s\n' "$STAMP"; cat main.css.tmp; } > main.css
rm -f main.css.tmp

echo "== 4/4 JS =="
npx --yes esbuild@0.25.0 src/app.js --minify --charset=utf8 \
  --target=chrome110,edge110,firefox110,safari16 --outfile=js/app.js --log-level=warning

echo
echo "== 产物 =="
ls -l main.css js/app.js fonts/*.woff2 | awk '{printf "%-28s %8.1f KB\n", $9, $5/1024}'
