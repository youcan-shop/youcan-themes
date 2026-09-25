#!/usr/bin/env python3
"""Regenerate a theme's subsetted HugeIcons stylesheet.

The upstream CDN ships every icon (209 KB of CSS + 659 KB of woff2) and offers no
allowlist parameter, so the subset is built here instead. The font is embedded in
the stylesheet as a data URI, so the theme serves one text asset and nothing has
to resolve a separate binary at runtime.

Requires: pip install fonttools brotli
Usage:    python3 tooling/subset-icons.py bella
"""

import base64
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
        subset = Path(tmp) / "subset.woff2"
        source.write_bytes(urllib.request.urlopen(FONT_URL).read())
        subprocess.run(
            [
                "pyftsubset",
                str(source),
                "--unicodes=" + ",".join(f"U+{ord(c):04X}" for c in resolved.values()),
                "--flavor=woff2",
                "--no-hinting",
                "--desubroutinize",
                f"--output-file={subset}",
            ],
            check=True,
        )
        font = subset.read_bytes()

    print(f"  subset font: {len(font):,} bytes, embedded as a data URI")

    encoded = base64.b64encode(font).decode("ascii")
    rules = "".join(f'.hgi-stroke.{name}:before{{content:"{char}"}}' for name, char in resolved.items())
    (assets / "icons.css").write_text(
        "@charset \"UTF-8\";"
        "@font-face{"
        'font-family:"hgi-stroke-rounded";'
        f"src:url(data:font/woff2;base64,{encoded}) format('woff2');"
        "font-display:block"
        "}"
        ".hgi-stroke{"
        'font-family:"hgi-stroke-rounded" !important;'
        "font-style:normal;"
        "-webkit-font-smoothing:antialiased;"
        "-moz-osx-font-smoothing:grayscale;"
        "position:relative"
        "}"
        ".hgi-stroke:after{opacity:.4;position:absolute;left:0}"
        f"{rules}\n",
        encoding="utf-8",
    )

    print(f"  assets/icons.css: {(assets / 'icons.css').stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
