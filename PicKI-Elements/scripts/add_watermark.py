#!/usr/bin/env python3
import sys, os
from PIL import Image

WATERMARK_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fairewelt_watermark.png')

def add_watermark(input_path, output_path):
    try:
        base = Image.open(input_path).convert('RGBA')
        wm = Image.open(WATERMARK_PATH).convert('RGBA')
        wm_size = max(50, min(100, int(base.width * 0.05)))
        wm = wm.resize((wm_size, wm_size), Image.LANCZOS)
        margin = 10
        pos = (base.width - wm_size - margin, base.height - wm_size - margin)
        overlay = Image.new('RGBA', base.size, (0,0,0,0))
        overlay.paste(wm, pos, wm)
        result = Image.alpha_composite(base, overlay)
        result.save(output_path, 'PNG')
        print(f"OK:{output_path}")
    except Exception as e:
        print(f"ERROR:{e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(1)
    add_watermark(sys.argv[1], sys.argv[2])
