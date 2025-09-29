#!/usr/bin/env python3
"""
Create a favicon.ico file with the AI-Augmented diamond logo
"""

import struct
import math

def create_diamond_favicon():
    """Create a 32x32 favicon with diamond logo"""
    width, height = 32, 32
    
    # Create RGBA data for 32x32 image
    pixels = []
    
    # Define diamond coordinates (centered)
    center_x, center_y = 16, 16
    diamond_size = 10
    
    # Colors (matching the gradient from logo)
    bg_color = (0, 0, 0, 0)  # Transparent background
    diamond_color = (198, 172, 142, 255)  # #C6AC8E
    border_color = (139, 115, 85, 255)    # #8B7355
    
    for y in range(height):
        for x in range(width):
            # Calculate distance from center
            dx = abs(x - center_x)
            dy = abs(y - center_y)
            
            # Diamond shape: |x-cx| + |y-cy| <= size
            diamond_distance = dx + dy
            
            if diamond_distance <= diamond_size:
                if diamond_distance >= diamond_size - 1:
                    # Border
                    pixels.extend(border_color)
                else:
                    # Fill
                    pixels.extend(diamond_color)
            else:
                # Background
                pixels.extend(bg_color)
    
    return bytes(pixels), width, height

def create_ico_file(filename):
    """Create ICO file with 32x32 favicon"""
    rgba_data, width, height = create_diamond_favicon()
    
    # Convert RGBA to BGRA (Windows ICO format)
    bgra_data = bytearray()
    for i in range(0, len(rgba_data), 4):
        r, g, b, a = rgba_data[i:i+4]
        bgra_data.extend([b, g, r, a])
    
    # ICO file structure
    ico_header = struct.pack('<HHH', 0, 1, 1)  # Reserved, Type, Count
    
    # Directory entry
    dir_entry = struct.pack('<BBBBHHLL', 
                           width, height,    # Width, Height
                           0, 0,            # Colors, Reserved
                           1, 32,           # Planes, BitCount
                           len(bgra_data) + 40,  # Size (data + bitmap header)
                           22)              # Offset
    
    # Bitmap header (40 bytes)
    bitmap_header = struct.pack('<LLLHHLLLLLL',
                               40,           # Header size
                               width,        # Width
                               height * 2,   # Height (doubled for ICO)
                               1,            # Planes
                               32,           # Bits per pixel
                               0,            # Compression
                               len(bgra_data), # Image size
                               0, 0, 0, 0)   # X/Y pixels per meter, colors used/important
    
    # Write ICO file
    with open(filename, 'wb') as f:
        f.write(ico_header)
        f.write(dir_entry)
        f.write(bitmap_header)
        f.write(bgra_data)
    
    print(f"Created {filename} with diamond logo favicon")

if __name__ == "__main__":
    create_ico_file("frontend/public/favicon.ico")