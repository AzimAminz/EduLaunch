"""
Makes the pixel-art Rimau used in the interest quest, from the mascot's own illustration, so it stays the same
character: same colours, cap, jacket and shoes.

Output: apps/web/public/sprites/rimau-idle.svg, a strip of FRAMES frames side by side, played at 24 frames a second
by CSS (steps). Each frame is the mascot swaying and breathing, with a blink near the end of the loop, shrunk to a
small pixel grid with one shared palette. Every colour of a frame is one SVG path, so the file stays small.

Run (needs Pillow): python tools/scripts/rimau-sprite.py
"""

from __future__ import annotations

import math
import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = ROOT / "apps/web/public/illustrations/rimau-waving.png"
OUT = ROOT / "apps/web/public/sprites/rimau-idle.svg"

FRAMES = 48  # 2 seconds at 24 fps
GRID_H = 64  # pixel rows of the sprite
COLOURS = 32
# The eyes in the 640 x 640 illustration (centre, radius), for the blink.
EYES = [((262, 186), 40), ((400, 217), 40)]
BLINK = {38, 39, 40}  # frames with the eyes shut
SQUINT = {37, 41}  # half shut on the way


def blink(img: Image.Image, amount: float) -> Image.Image:
    """Covers each eye with fur from above it and draws the closed lid as a curved dark line."""
    img = img.copy()
    draw = ImageDraw.Draw(img)
    for (cx, cy), r in EYES:
        fur = img.getpixel((cx, cy - r - 8))
        top = cy - r + int(2 * r * (1 - amount) / 2) if amount < 1 else cy - r
        draw.ellipse((cx - r, top, cx + r, cy + r), fill=fur)
        draw.arc((cx - r + 6, cy - r // 2, cx + r - 6, cy + r // 2 + 4), start=20, end=160, fill=(40, 24, 20, 255), width=9)
    return img


def frame(base: Image.Image, i: int) -> Image.Image:
    t = i / FRAMES
    sway = 2.2 * math.sin(2 * math.pi * t)  # degrees, around the feet
    breathe = 0.022 * (0.5 - 0.5 * math.cos(4 * math.pi * t))  # squash and stretch twice a loop
    img = blink(base, 1.0) if i in BLINK else blink(base, 0.5) if i in SQUINT else base
    w, h = img.size
    # Stretch up a little (and narrower), anchored at the feet.
    sh = int(h * (1 + breathe))
    sw = int(w * (1 - breathe / 2))
    stretched = img.resize((sw, sh), Image.LANCZOS)
    canvas = Image.new("RGBA", (w, h + 40), (0, 0, 0, 0))
    canvas.paste(stretched, ((w - sw) // 2, h + 40 - sh), stretched)
    return canvas.rotate(sway, resample=Image.BICUBIC, center=(w // 2, h + 40 - 10))


def pixelate(img: Image.Image, size: tuple[int, int], palette: Image.Image | None):
    small = img.resize(size, Image.BOX)
    alpha = small.getchannel("A").point(lambda a: 255 if a > 140 else 0)
    rgb = Image.new("RGB", size, (255, 255, 255))
    rgb.paste(small, mask=alpha)
    q = rgb.quantize(colors=COLOURS, method=Image.Quantize.MEDIANCUT) if palette is None else rgb.quantize(palette=palette, dither=Image.Dither.NONE)
    return q, alpha


def main() -> None:
    src = Image.open(SOURCE).convert("RGBA")
    src = src.crop(src.getbbox())
    first = frame(src, 0)
    w = round(first.width * GRID_H / first.height)
    size = (w, GRID_H)
    palette, _ = pixelate(first, size, None)
    colours = palette.getpalette()[: COLOURS * 3]
    hexes = ["#%02x%02x%02x" % tuple(colours[k * 3 : k * 3 + 3]) for k in range(COLOURS)]

    groups = []
    for i in range(FRAMES):
        q, alpha = pixelate(frame(src, i), size, palette)
        px, a = q.load(), alpha.load()
        paths: dict[int, list[str]] = {}
        for y in range(GRID_H):
            x = 0
            while x < w:
                if not a[x, y]:
                    x += 1
                    continue
                c = px[x, y]
                end = x
                while end < w and a[end, y] and px[end, y] == c:
                    end += 1
                paths.setdefault(c, []).append(f"M{x} {y}h{end - x}v1h-{end - x}z")
                x = end
        body = "".join(f'<path fill="{hexes[c]}" d="{"".join(d)}"/>' for c, d in sorted(paths.items()))
        groups.append(f'<g transform="translate({i * w} 0)">{body}</g>')

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w * FRAMES} {GRID_H}" width="{w * FRAMES}" height="{GRID_H}" shape-rendering="crispEdges">'
        + "".join(groups)
        + "</svg>\n"
    )
    print(f"{OUT} {w}x{GRID_H} x {FRAMES} frames, {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
