#!/usr/bin/env python3
"""Regenerate a theme's subsetted HugeIcons font and stylesheet.

The upstream CDN ships every icon (209 KB of CSS + 659 KB of woff2) and offers no
allowlist parameter, so the subset is built here instead.

Requires: pip install fonttools brotli
Usage:    python3 tooling/subset-icons.py bella
"""

import re
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

CSS_URL = "https://cdn.hugeicons.com/font/hgi-stroke-rounded.css"
FONT_URL = "https://cdn.hugeicons.com/font/hgi-stroke-rounded.woff2?t=1721855138058"
ROOT = Path(__file__).resolve().parent.parent
SCAN_DIRS = ("sections", "snippets", "config", "templates", "layouts")


def collect_names(theme_path):
    names = set()
    for folder in SCAN_DIRS:
        for path in (theme_path / folder).rglob("*"):
            if path.suffix in (".liquid", ".json"):
                names |= set(re.findall(r"hgi-[a-z0-9-]+", path.read_text()))
    return names - {"hgi-stroke", "hgi-stroke-rounded", "hgi-subset"}


def main():
    theme = sys.argv[1] if len(sys.argv) > 1 else "bella"
    theme_path = ROOT / "themes" / theme
    assets = theme_path / "assets"

    css = urllib.request.urlopen(CSS_URL).read().decode("utf-8-sig")
    glyphs = dict(re.findall(r'\.hgi-stroke\.(hgi-[a-z0-9-]+):before\{content:"(.)"\}', css))

    used = collect_names(theme_path)
    resolved = {name: glyphs[name] for name in sorted(used) if name in glyphs}
    missing = sorted(used - set(glyphs))

    print(f"{theme}: {len(resolved)} of {len(glyphs)} icons kept")
    if missing:
        print(f"  no glyph upstream (renders blank): {', '.join(missing)}")

    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / "full.woff2"
        source.write_bytes(urllib.request.urlopen(FONT_URL).read())
        subprocess.run(
            [
                "pyftsubset",
                str(source),
                "--unicodes=" + ",".join(f"U+{ord(c):04X}" for c in resolved.values()),
                "--flavor=woff2",
                "--no-hinting",
                "--desubroutinize",
                f"--output-file={assets / 'hgi-subset.woff2'}",
            ],
            check=True,
        )

    rules = "".join(f'.hgi-stroke.{name}:before{{content:"{char}"}}' for name, char in resolved.items())
    (assets / "icons.css").write_text(
        ".hgi-stroke{"
        'font-family:"hgi-stroke-rounded" !important;'
        "font-style:normal;"
        "-webkit-font-smoothing:antialiased;"
        "-moz-osx-font-smoothing:grayscale;"
        "position:relative"
        "}"
        ".hgi-stroke:after{opacity:.4;position:absolute;left:0}"
        f"{rules}\n"
    )

    for name in ("hgi-subset.woff2", "icons.css"):
        print(f"  assets/{name}: {(assets / name).stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
