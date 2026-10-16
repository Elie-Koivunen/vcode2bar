#!/usr/bin/env python3
"""Draw the vcode2bar icon (the same design as web/icon.svg) and write
packaging/assets/vcode2bar.png (256 px) and vcode2bar.ico (16-256 px).

    python packaging/make_icon.py        (needs Pillow; the output files are committed)
"""
from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent / "assets"
BLUE, WHITE, INK = (29, 78, 137, 255), (255, 255, 255, 255), (17, 17, 17, 255)
# bars of the web icon, in its 64-unit grid: (x, width)
BARS = [(13, 3), (18, 1.5), (21.5, 4.5), (28, 1.5), (31.5, 3), (36.5, 1.5), (40, 4.5), (46.5, 1.5), (49.5, 1.5)]


def draw(size: int) -> Image.Image:
    s = size / 64
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=12 * s, fill=BLUE)
    d.rounded_rectangle([8 * s, 10 * s, 56 * s, 54 * s], radius=4 * s, fill=WHITE)
    for x, w in BARS:
        d.rectangle([x * s, 16 * s, (x + w) * s - 1, 42 * s], fill=INK)
    d.rounded_rectangle([13 * s, 45 * s, 51 * s, 48 * s], radius=1.5 * s, fill=BLUE)
    return im


def main() -> None:
    ASSETS.mkdir(exist_ok=True)
    big = draw(1024).resize((256, 256), Image.LANCZOS)        # draw large, scale down: smooth edges
    big.save(ASSETS / "vcode2bar.png", optimize=True)
    big.save(ASSETS / "vcode2bar.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print("wrote", ASSETS / "vcode2bar.png", "and", ASSETS / "vcode2bar.ico")


if __name__ == "__main__":
    main()
