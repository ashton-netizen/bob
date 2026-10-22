#!/usr/bin/env python3
"""Build the BOB mark: GC Vank 'B' traced to a path, on a near-black tile, one accent step bar.
Tokens from scm-design-skill references/design-tokens.md: bg #0F0F0F, white #FFFFFF,
solo flat accent for icons = #F75821 (the token file wins over the SKILL.md summary).
Outputs: favicon.svg (dark default), favicon-light.svg, PNGs at 16/32/48/180/512, both variants.
"""
import sys, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
import cairosvg

FONT = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

BG = "#0F0F0F"; WHITE = "#FFFFFF"; ACCENT = "#F75821"

font = TTFont(FONT)
gs = font.getGlyphSet()
cmap = font.getBestCmap()
gname = cmap[ord("B")]
glyph = gs[gname]
pen = SVGPathPen(gs); glyph.draw(pen); d = pen.getCommands()
bp = BoundsPen(gs); glyph.draw(bp); xmin, ymin, xmax, ymax = bp.bounds
upm = font["head"].unitsPerEm
gw, gh = xmax - xmin, ymax - ymin

# Tile geometry in a 512 box
T = 512; R = 112  # radius ~22%
# Letter box: B occupies ~52% of tile height, centred horizontally, raised to leave room for the step bar
cap_target = T * 0.52
scale = cap_target / gh
lw = gw * scale
bar_h = T * 0.055; bar_gap = T * 0.075
block_h = cap_target + bar_gap + bar_h
top = (T - block_h) / 2
lx = (T - lw) / 2
# font y is up; flip: translate then scale(1,-1)
ty = top + cap_target  # baseline position in SVG coords
transform = f"translate({lx - xmin*scale:.3f},{ty + ymin*scale:.3f}) scale({scale:.5f},{-scale:.5f})"
bar_w = lw  # bar matches the letter width: the step BOB stands on
bar_x = lx; bar_y = ty + bar_gap

def svg(bg, fg, accent):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {T} {T}" width="{T}" height="{T}" role="img" aria-label="BOB">
  <title>BOB</title>
  <rect width="{T}" height="{T}" rx="{R}" ry="{R}" fill="{bg}"/>
  <path d="{d}" transform="{transform}" fill="{fg}"/>
  <rect x="{bar_x:.2f}" y="{bar_y:.2f}" width="{bar_w:.2f}" height="{bar_h:.2f}" rx="{bar_h/2:.2f}" fill="{accent}"/>
</svg>
'''

variants = {"favicon": svg(BG, WHITE, ACCENT), "favicon-light": svg(WHITE, BG, ACCENT)}
for name, s in variants.items():
    p = os.path.join(OUT, f"{name}.svg"); open(p, "w").write(s)
    for px in (16, 32, 48, 180, 512):
        cairosvg.svg2png(bytestring=s.encode(), write_to=os.path.join(OUT, f"{name}-{px}.png"), output_width=px, output_height=px)
print("glyph", gname, "bounds", (xmin, ymin, xmax, ymax), "upm", upm)
print("written:", sorted(os.listdir(OUT)))
