import os
from PIL import Image, ImageDraw

def create_gradient_canvas(width, height, start_color, end_color):
    """Creates a diagonal linear gradient image."""
    base = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    
    for y in range(height):
        for x in range(width):
            factor = (x + y) / (width + height)
            r = int(start_color[0] + factor * (end_color[0] - start_color[0]))
            g = int(start_color[1] + factor * (end_color[1] - start_color[1]))
            b = int(start_color[2] + factor * (end_color[2] - start_color[2]))
            a = int(start_color[3] + factor * (end_color[3] - start_color[3]))
            draw.point((x, y), (r, g, b, a))
            
    return base

def draw_rounded_mask(width, height, radius):
    """Creates a mask with rounded corners."""
    mask = Image.new('L', (width, height), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, width, height], radius, fill=255)
    return mask

def generate_icon():
    size = 512
    radius = 120
    
    # 1. Background Gradient (Hot purple to deep dark slate for contrast)
    start_color = (139, 92, 246, 255)  # Purple #8B5CF6
    end_color = (79, 70, 229, 255)     # Indigo #4F46E5
    bg = create_gradient_canvas(size, size, start_color, end_color)
    
    mask = draw_rounded_mask(size, size, radius)
    icon_base = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    icon_base.paste(bg, (0, 0), mask=mask)
    
    draw = ImageDraw.Draw(icon_base)
    
    # 2. Draw multiple button pills representing "only copy buttons"
    # Row 1 Left Pill
    draw.rounded_rectangle([100, 120, 240, 200], radius=40, fill=(255, 255, 255, 40), outline=(255,255,255,80), width=4)
    draw.rounded_rectangle([130, 150, 210, 170], radius=10, fill=(255, 255, 255, 100))
    
    # Row 1 Right Pill (Tiny)
    draw.rounded_rectangle([280, 120, 412, 200], radius=40, fill=(255, 255, 255, 40), outline=(255,255,255,80), width=4)
    draw.ellipse([326, 140, 366, 180], fill=(255, 255, 255, 100))
    
    # Row 2 Highlighted Active Pill (Glowing Cyan/Teal copy button)
    # Shadow first
    draw.rounded_rectangle([112, 252, 412, 352], radius=50, fill=(0, 0, 0, 60))
    # Main Pill
    draw.rounded_rectangle([100, 240, 400, 340], radius=50, fill=(6, 182, 212, 255), outline=(255,255,255,200), width=6) # Cyan #06B6D4
    
    # Text line representation inside the active pill
    draw.rounded_rectangle([160, 278, 300, 302], radius=12, fill=(255, 255, 255, 255))
    # Tiny green click indicator or double doc icon inside it
    # We will draw a small copy sheets icon on the right
    draw.rounded_rectangle([324, 276, 344, 304], radius=4, fill=(255, 255, 255, 120), outline=(255,255,255,255), width=2)
    draw.rounded_rectangle([330, 282, 350, 310], radius=4, fill=(255, 255, 255, 240), outline=(255,255,255,255), width=2)
    
    # Row 3 Left Pill
    draw.rounded_rectangle([100, 380, 220, 460], radius=40, fill=(255, 255, 255, 40), outline=(255,255,255,80), width=4)
    # Row 3 Right Pill
    draw.rounded_rectangle([260, 380, 412, 460], radius=40, fill=(255, 255, 255, 40), outline=(255,255,255,80), width=4)

    os.makedirs("icons", exist_ok=True)
    
    sizes = [16, 32, 48, 128]
    for s in sizes:
        img_resized = icon_base.resize((s, s), Image.Resampling.LANCZOS)
        img_resized.save(f"icons/icon{s}.png")
        print(f"Generated icons/icon{s}.png")

if __name__ == "__main__":
    generate_icon()
