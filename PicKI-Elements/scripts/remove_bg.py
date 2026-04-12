#!/usr/bin/env python3
"""
RealiMorph – Hintergrund-Entfernung via rembg
Aufruf: python3 remove_bg.py <input_path> <output_path>
"""

import sys
import os
from pathlib import Path

def remove_background(input_path: str, output_path: str):
    try:
        from rembg import remove
        from PIL import Image
        import io

        with open(input_path, 'rb') as f:
            input_data = f.read()

        output_data = remove(input_data)

        img = Image.open(io.BytesIO(output_data)).convert("RGBA")
        img.save(output_path, "PNG")

        print(f"OK:{output_path}")

    except Exception as e:
        print(f"ERROR:{str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: remove_bg.py <input> <output>", file=sys.stderr)
        sys.exit(1)
    remove_background(sys.argv[1], sys.argv[2])
