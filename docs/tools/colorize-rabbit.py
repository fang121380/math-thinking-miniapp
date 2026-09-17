from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "miniprogram" / "assets" / "thinking-rabbit.png"
OUTPUT = ROOT / "miniprogram" / "assets" / "thinking-rabbit-color.png"


def enclosed_regions(line_art: Image.Image) -> Image.Image:
    alpha = line_art.getchannel("A")
    boundary = alpha.point(lambda value: 255 if value >= 36 else 0).filter(ImageFilter.MaxFilter(3))
    padded = ImageOps.expand(boundary, border=2, fill=0)
    walkable = ImageChops.invert(padded)
    ImageDraw.floodfill(walkable, (0, 0), 128, thresh=0)
    outside = walkable.point(lambda value: 255 if value == 128 else 0).crop(
        (2, 2, padded.width - 2, padded.height - 2)
    )
    return ImageChops.invert(ImageChops.lighter(outside, boundary))


def clipped_shape(size, points=None, ellipse=None, mask=None):
    shape = Image.new("L", size, 0)
    draw = ImageDraw.Draw(shape)
    if points:
        draw.polygon(points, fill=255)
    if ellipse:
        draw.ellipse(ellipse, fill=255)
    return ImageChops.multiply(shape, mask)


line_art = Image.open(SOURCE).convert("RGBA")
inside = enclosed_regions(line_art)
result = Image.new("RGBA", line_art.size, (0, 0, 0, 0))

body = Image.new("RGBA", line_art.size, "#F7E8C9")
result.paste(body, (0, 0), inside)

ear_mask = ImageChops.lighter(
    clipped_shape(line_art.size, points=[(109, 87), (115, 40), (174, 0), (149, 74), (135, 91)], mask=inside),
    clipped_shape(line_art.size, points=[(143, 88), (166, 42), (220, 4), (202, 70), (176, 109)], mask=inside),
)
ear_color = Image.new("RGBA", line_art.size, "#F3B7B1")
result.paste(ear_color, (0, 0), ear_mask)

belly_mask = clipped_shape(line_art.size, ellipse=(143, 214, 273, 370), mask=inside)
belly_color = Image.new("RGBA", line_art.size, (203, 223, 187, 112))
result.alpha_composite(Image.composite(belly_color, Image.new("RGBA", line_art.size), belly_mask))

cheek_mask = clipped_shape(line_art.size, ellipse=(105, 158, 132, 181), mask=inside)
cheek_color = Image.new("RGBA", line_art.size, (230, 129, 111, 135))
result.alpha_composite(Image.composite(cheek_color, Image.new("RGBA", line_art.size), cheek_mask))

result.alpha_composite(line_art)
highlight = ImageDraw.Draw(result)
highlight.ellipse((95, 142, 102, 149), fill=(255, 255, 255, 255))
result.save(OUTPUT, optimize=True)

print(f"saved {OUTPUT} ({result.width}x{result.height})")
