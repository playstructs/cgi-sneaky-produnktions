"""Makes the profile pictures this site hosts (sneaky/pfp/) from the Sneaky
Produnktions NFT archive (../Sneaky, see its README.txt).

Every artwork becomes a 320px square WebP, sneaky/pfp/<collection>/<id>.webp,
and sneaky/pfp/collections.json lists each collection, its ids and any it
lacks; the gallery (sneaky/runtime/gallery.js) reads it.

The artworks are photographs of drawings on paper, of every shape, most with
wide margins. Each is cropped to a square around its drawing, so the drawing
fills a portrait and none of it is lost: the ink is found by its contrast with
the paper around it. A drawing longer than its sheet is wide gets more paper at
the sides; one that covers a nearly square sheet loses only its fringes, and one
that covers a longer sheet is shown whole, over a blurred copy of itself.

    ../RektGang/.venv/bin/python -I sneaky/make_pfps.py [../Sneaky]

Any Python with Pillow does. Existing pictures are kept; delete one (or a
collection's folder) to remake it.
"""
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageOps

SIZE = 320
HERE = Path(__file__).resolve().parent
OUT = HERE / 'pfp'

# slug, name, tab label, archive folder, first id, last id
COLLECTIONS = [
    ('animals', 'Sneaky Animals', 'Animals', 'Sneaky Animals', 1, 999),
    ('people', 'Sneaky People', 'People', 'Sneaky People', 1, 999),
    ('stuff', 'Sneaky Stuff', 'Stuff', 'Sneaky Stuff', 1, 420),
    ('transformation', 'Sneaky Transformation', 'Transformation', 'Sneaky Transformation', 1, 196),
]

ANALYSIS = 256     # the longer side, when looking for ink
CONTRAST = 22      # how far ink is from the paper around it, of 255
MARGIN = 0.07      # paper kept around the drawing, of its longer side
FULL_SHEET = 0.94  # drawn across this much of the sheet: there is no paper to crop
LONG_SHEET = 1.15  # such a sheet, longer than this, is shown whole rather than cropped


def ink_box(im):
    """The drawing's box, as fractions of the sheet (left, top, right, bottom)."""
    scale = ANALYSIS / max(im.size)
    small = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    # The paper: every channel's brightest neighbourhood, smoothed, so shadows
    # and the light falling off across the sheet aren't taken for ink.
    paper = small.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(14))
    channels = ImageChops.difference(small, paper).split()
    contrast = ImageChops.lighter(ImageChops.lighter(channels[0], channels[1]), channels[2])
    ink = contrast.filter(ImageFilter.GaussianBlur(0.8)).point(lambda v: 255 if v >= CONTRAST else 0)

    # A row or column is drawn on when a run of pixels is; specks and the dark
    # edges of a photograph aren't.
    w, h = ink.size
    edge = 3
    ink = ImageOps.expand(ink.crop((edge, edge, w - edge, h - edge)), edge, 0)
    pixels = ink.load()
    columns = [sum(pixels[x, y] > 0 for y in range(h)) for x in range(w)]
    rows = [sum(pixels[x, y] > 0 for x in range(w)) for y in range(h)]
    xs = [x for x, n in enumerate(columns) if n >= 2]
    ys = [y for y, n in enumerate(rows) if n >= 2]
    if not xs or not ys:
        return 0, 0, 1, 1
    return xs[0] / w, ys[0] / h, (xs[-1] + 1) / w, (ys[-1] + 1) / h


def widen(im, left, right):
    """The sheet with more paper at its sides: its own edges, carried on."""
    strip = max(2, im.width // 40)
    out = Image.new('RGB', (im.width + left + right, im.height))
    for x, width, box in ((0, left, (0, 0, strip, im.height)),
                          (left + im.width, right, (im.width - strip, 0, im.width, im.height))):
        if width:
            edge = im.crop(box).resize((1, im.height), Image.BOX).filter(ImageFilter.GaussianBlur(6))
            out.paste(edge.resize((width, im.height)), (x, 0))
    out.paste(im, (left, 0))
    return out


def crop(im):
    w, h = im.size
    left, top, right, bottom = ink_box(im)
    if right - left >= FULL_SHEET or bottom - top >= FULL_SHEET and right - left >= 0.8:
        # Drawn to the edges: there is nothing to crop but the drawing itself.
        if max(w, h) > LONG_SHEET * min(w, h):
            return whole(im)
        side = min(w, h)
        x, y = (w - side) // 2, round((h - side) * 0.2)
        return im.crop((x, y, x + side, y + side))

    ink_w, ink_h = (right - left) * w, (bottom - top) * h
    side = min(round(max(ink_w, ink_h) * (1 + 2 * MARGIN)), max(w, h))
    cx, cy = (left + right) / 2 * w, (top + bottom) / 2 * h
    if side > h:
        # A wide drawing on a wide sheet: the paper is missing above and below.
        turned = im.transpose(Image.Transpose.ROTATE_90)  # counter-clockwise
        out = place(turned, cy, w - cx, side)
        return out.transpose(Image.Transpose.ROTATE_270)
    return place(im, cx, cy, side)


def whole(im):
    """All of the sheet, over a blurred copy of itself that fills the square."""
    side = max(im.size)
    out = ImageOps.fit(im, (side, side), Image.LANCZOS).filter(ImageFilter.GaussianBlur(side / 24))
    out.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    return out


def place(im, cx, cy, side):
    """A square of `side` around (cx, cy), with more paper at the sides if needed."""
    w, h = im.size
    x = cx - side / 2
    if side > w:
        pad_left = max(0, round(-x))
        pad_right = max(0, round(x + side - w))
        im = widen(im, pad_left, pad_right)
        x += pad_left
    x = min(max(0, round(x)), im.width - side)
    y = min(max(0, round(cy - side / 2)), h - side)
    return im.crop((x, y, x + side, y + side))


def convert(job):
    src, dst = job
    if dst.exists():
        return
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert('RGB')
        out = crop(im).resize((SIZE, SIZE), Image.LANCZOS)
        tmp = dst.with_suffix('.tmp')
        out.save(tmp, 'WEBP', quality=82, method=6)
        os.replace(tmp, dst)


def main(archive):
    jobs, manifest = [], []
    for slug, name, label, folder, first, last in COLLECTIONS:
        (OUT / slug).mkdir(parents=True, exist_ok=True)
        missing = []
        for id_ in range(first, last + 1):
            src = archive / folder / 'images' / f'{id_}.jpg'
            if src.exists():
                jobs.append((src, OUT / slug / f'{id_}.webp'))
            else:
                missing.append(id_)
        manifest.append({'slug': slug, 'name': name, 'label': label, 'first': first, 'last': last, 'missing': missing})
        print(f'{slug}: {first}-{last}, missing {missing or "none"}', flush=True)

    with ProcessPoolExecutor() as pool:
        for i, _ in enumerate(pool.map(convert, jobs, chunksize=16), 1):
            if i % 500 == 0:
                print(f'{i}/{len(jobs)}', flush=True)

    (OUT / 'collections.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'{len(jobs)} pictures in {OUT}')


if __name__ == '__main__':
    main(Path(sys.argv[1] if len(sys.argv) > 1 else HERE.parent.parent / 'Sneaky').resolve())
