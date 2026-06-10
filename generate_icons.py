import os
from PIL import Image, ImageDraw

def create_gradient_canvas(width, height, start_color, end_color):
    """Creates a diagonal linear gradient image."""
    base = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    
    # Simple linear interpolation for diagonal gradient
    for y in range(height):
        for x in range(width):
            # Calculate interpolation factor based on diagonal distance
            factor = (x + y) / (width + height)
            r = int(start_color[0] + factor * (end_color[0] - start_color[0]))
            g = int(start_color[1] + factor * (end_color[1] - start_color[1]))
            b = int(start_color[2] + factor * (end_color[2] - start_color[2]))
            a = int(start_color[3] + factor * (end_color[3] - start_color[3]))
            draw.point((x, y), (r, g, b, a))
            
    return base

def draw_rounded_mask(width, height, radius):
    """Creates a black mask with rounded corners."""
    mask = Image.new('L', (width, height), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, width, height], radius, fill=255)
    return mask

def generate_icon():
    # We build at 512x512 for high resolution, then downscale
    size = 512
    radius = 120
    
    # 1. Background Gradient (Sleek deep indigo to electric cyan/teal)
    start_color = (79, 70, 229, 255)  # Indigo #4F46E5
    end_color = (6, 182, 212, 255)    # Cyan #06B6D4
    bg = create_gradient_canvas(size, size, start_color, end_color)
    
    # Rounded corners mask for background
    mask = draw_rounded_mask(size, size, radius)
    icon_base = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    icon_base.paste(bg, (0, 0), mask=mask)
    
    # 2. Draw Graphics
    draw = ImageDraw.Draw(icon_base)
    
    # We will draw a double document representation (the "Copy" symbol)
    # Plus a checkmark badge (denoting outreach success)
    
    # Back document shadow/outline
    # Coordinates for back document (slightly offset to the top-left)
    back_rect = [120, 120, 320, 360]
    draw.rounded_rectangle(back_rect, radius=24, fill=(255, 255, 255, 40), outline=(255, 255, 255, 80), width=4)
    
    # Front document (offset to bottom-right, clean opaque white card)
    front_rect = [190, 190, 390, 430]
    # Draw shadow first
    shadow_offset = 12
    shadow_rect = [front_rect[0] + shadow_offset, front_rect[1] + shadow_offset, front_rect[2] + shadow_offset, front_rect[3] + shadow_offset]
    draw.rounded_rectangle(shadow_rect, radius=24, fill=(0, 0, 0, 60))
    
    # Draw main front card
    draw.rounded_rectangle(front_rect, radius=24, fill=(255, 255, 255, 240))
    
    # Lines inside the front card representing notes
    draw.rounded_rectangle([230, 240, 350, 252], radius=6, fill=(100, 116, 139, 200))
    draw.rounded_rectangle([230, 280, 350, 292], radius=6, fill=(100, 116, 139, 150))
    draw.rounded_rectangle([230, 320, 310, 332], radius=6, fill=(100, 116, 139, 100))
    
    # Glow ring around the badge
    badge_center = (400, 150)
    badge_radius = 55
    # Success/outreach green badge with white checkmark
    draw.ellipse([badge_center[0] - badge_radius, badge_center[1] - badge_radius,
                  badge_center[0] + badge_radius, badge_center[1] + badge_radius],
                 fill=(16, 185, 129, 255)) # Emerald Green
                  
    # Border for the badge to pop
    draw.ellipse([badge_center[0] - badge_radius, badge_center[1] - badge_radius,
                  badge_center[0] + badge_radius, badge_center[1] + badge_radius],
                 outline=(255, 255, 255, 255), width=8)
    
    # Draw checkmark inside badge
    # Checkmark lines (x1, y1) -> (x2, y2) -> (x3, y3)
    # Center is (400, 150)
    draw.line([(375, 150), (395, 172), (430, 130)], fill=(255, 255, 255, 255), width=10, joint="round")

    # Make output directory
    os.makedirs("icons", exist_ok=True)
    
    # Save in standard chrome extension sizes
    sizes = [16, 32, 48, 128]
    for s in sizes:
        # Downsample using Resampling.LANCZOS for premium crispness
        img_resized = icon_base.resize((s, s), Image.Resampling.LANCZOS)
        img_resized.save(f"icons/icon{s}.png")
        print(f"Generated icons/icon{s}.png")

if __name__ == "__main__":
    generate_icon()
