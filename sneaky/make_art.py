"""Makes the Sneaky Produnktions badge, logo and icons from their pig logo
(../Sneaky/logos/community-avatar.jpg, the @SneakyProds avatar).

    ../RektGang/.venv/bin/python -I sneaky/make_art.py [../Sneaky]

Any Python with Pillow does.
"""
import shutil
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ARCHIVE = Path(sys.argv[1] if len(sys.argv) > 1 else HERE.parent.parent / 'Sneaky').resolve()
IMG = HERE / 'public/sneaky/img'

avatar = Image.open(ARCHIVE / 'logos/community-avatar.jpg').convert('RGB')

# The pig is drawn in light on black, so its light is its opacity: black
# becomes clear, and the lines keep their colour at full strength.
pixels = []
for r, g, b in avatar.get_flattened_data():
    light = max(r, g, b)
    alpha = min(255, max(0, round((light - 60) * 255 / 140)))
    scale = 255 / light if 0 < light < 200 and alpha else 1
    pixels.append((min(255, round(r * scale)), min(255, round(g * scale)), min(255, round(b * scale)), alpha))
pig = Image.new('RGBA', avatar.size)
pig.putdata(pixels)
pig = pig.crop(pig.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())


def fitted(size):
    scale = size / max(pig.size)
    return pig.resize((round(pig.width * scale), round(pig.height * scale)), Image.LANCZOS)


def on_black(size, inner):
    out = Image.new('RGBA', (size, size), (0, 0, 0, 255))
    face = fitted(inner)
    out.alpha_composite(face, ((size - face.width) // 2, (size - face.height) // 2))
    return out.convert('RGB')


IMG.mkdir(parents=True, exist_ok=True)

# Sign-up's 192px logo slot, at 2x: the pig in the top of the square, with room
# for the motto that webapp sets under it.
badge = Image.new('RGBA', (384, 384), (0, 0, 0, 0))
face = fitted(256)
badge.alpha_composite(face, ((384 - face.width) // 2, 8))
badge.save(IMG / 'sneaky-produnktions-badge.png', optimize=True)

# guild.json's logo: the avatar as it is.
shutil.copyfile(ARCHIVE / 'logos/community-avatar.jpg', IMG / 'sneaky-produnktions-logo.jpg')
on_black(180, 156).save(IMG / 'apple-touch-icon.png', optimize=True)
on_black(32, 32).save(IMG / 'favicon-32x32.png', optimize=True)
on_black(48, 46).save(HERE / 'public/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
