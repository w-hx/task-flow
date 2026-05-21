from PIL import Image, ImageDraw, ImageFilter

def create_taskflow_icon():
    # Size: 1024x1024 for high quality
    size = (1024, 1024)
    # Background color: A nice soft blue gradient or solid
    bg_color = (74, 144, 226) # #4A90E2 Blue
    
    # Create image with alpha channel
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded square (squircle) background
    # Mac icons usually have rounded corners. We'll draw a circle for simplicity as "Time" is circular
    # Or a rounded rectangle. Let's do a circle for the "Flow" and "Time" concept.
    # Actually macOS icons are squircles. Let's draw a rounded rectangle.
    
    rect_coords = [(50, 50), (974, 974)]
    radius = 220
    draw.rounded_rectangle(rect_coords, radius=radius, fill=bg_color)
    
    # Draw a Clock Face (White Circle Outline)
    center = (512, 512)
    clock_radius = 300
    clock_bbox = [
        (center[0] - clock_radius, center[1] - clock_radius),
        (center[0] + clock_radius, center[1] + clock_radius)
    ]
    draw.ellipse(clock_bbox, outline=(255, 255, 255), width=40)
    
    # Draw Clock Hands
    # Hour hand (pointing at 10)
    draw.line([center, (350, 350)], fill=(255, 255, 255), width=50)
    # Minute hand (pointing at 2)
    draw.line([center, (700, 350)], fill=(255, 255, 255), width=40)
    
    # Draw a "Flow" wave at the bottom inside the clock?
    # Or maybe just a simple checkmark inside?
    # Let's keep it clean: A clock face.
    
    # Save
    img.save('assets/icon.png')
    print("Generated assets/icon.png with Pillow")

if __name__ == "__main__":
    create_taskflow_icon()
