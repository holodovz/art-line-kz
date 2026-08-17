from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/upload/34164-removebg-preview(1).png')
target = Path('/home/ubuntu/webdev-static-assets/artline-logo-gold-cropped.png')
image = Image.open(source).convert('RGBA')
alpha = image.getchannel('A')
bounds = alpha.getbbox()
if bounds is None:
    raise RuntimeError('The logo has no visible pixels.')

padding = 12
left, top, right, bottom = bounds
crop_box = (
    max(0, left - padding),
    max(0, top - padding),
    min(image.width, right + padding),
    min(image.height, bottom + padding),
)
image.crop(crop_box).save(target, optimize=True)
print(target)
