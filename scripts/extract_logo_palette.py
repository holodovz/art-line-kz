from collections import Counter
from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/upload/34164-removebg-preview(1).png')
image = Image.open(source).convert('RGBA')
pixels = [rgb for rgb in image.getdata() if rgb[3] > 32 for rgb in [(rgb[0], rgb[1], rgb[2])]]

def quantize(color):
    return tuple((channel // 16) * 16 for channel in color)

counts = Counter(quantize(pixel) for pixel in pixels)
for color, count in counts.most_common(12):
    print(f'#{color[0]:02X}{color[1]:02X}{color[2]:02X} {count}')
