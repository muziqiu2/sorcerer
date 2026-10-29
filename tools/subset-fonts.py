#!/usr/bin/env python3
"""把思源宋体切成站点实际用到的字，产出两个 woff2（400 / 900）。

用法：python3 tools/subset-fonts.py <字体源目录>
字体源目录里需要 NotoSerifSC-Regular.otf 与 NotoSerifSC-Black.otf
（来源：https://github.com/notofonts/noto-cjk，Serif/SubsetOTF/SC/）。
"""

import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = sys.argv[1] if len(sys.argv) > 1 else "/opt/fonts"
OUT_DIR = os.path.join(ROOT, "fonts")

# 页面之外的兜底字：数字、农历、星期、标点
EXTRA = (
    "〇一二三四五六七八九十廿初星期农历年月日号周零壹贰叁肆伍陆柒捌玖"
    "，。、；：？！「」『』（）《》〈〉—…·　"
    "©®°×÷±§¶†‡•‰′″"
)

CHAR_SETS = [
    ("serif-400", "NotoSerifSC-Regular.otf"),
    ("serif-900", "NotoSerifSC-Black.otf"),
]


def collect_chars():
    chars = set(EXTRA)
    chars.update(chr(c) for c in range(0x20, 0x7F))
    for rel in ("index.html", "src/app.js", "src/main.css"):
        path = os.path.join(ROOT, rel)
        if os.path.exists(path):
            with open(path, encoding="utf-8") as fh:
                chars.update(fh.read())
    # 去掉控制字符
    return "".join(sorted(c for c in chars if c.isprintable() or c == " "))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    text_file = os.path.join(OUT_DIR, ".glyphs.txt")
    glyphs = collect_chars()
    with open(text_file, "w", encoding="utf-8") as fh:
        fh.write(glyphs)
    print(f"glyphs: {len(glyphs)} unique characters")

    for out_name, src_name in CHAR_SETS:
        src = os.path.join(SRC_DIR, src_name)
        if not os.path.exists(src):
            sys.exit(f"missing font: {src}")
        out = os.path.join(OUT_DIR, out_name + ".woff2")
        cmd = [
            sys.executable,
            "-m",
            "fontTools.subset",
            src,
            f"--text-file={text_file}",
            "--flavor=woff2",
            "--layout-features=kern,liga,clig,calt,vert",
            "--no-hinting",
            "--desubroutinize",
            f"--output-file={out}",
        ]
        subprocess.run(cmd, check=True)
        print(f"{out_name}.woff2  {os.path.getsize(out) / 1024:.1f} KB")

    os.remove(text_file)


if __name__ == "__main__":
    main()
