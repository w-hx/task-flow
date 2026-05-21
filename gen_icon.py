import struct
import zlib

def make_png(width, height):
    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    # Length (4 bytes), Type (4 bytes), Data, CRC (4 bytes)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_len = len(ihdr_data)
    ihdr_type = b'IHDR'
    ihdr_crc = zlib.crc32(ihdr_type + ihdr_data)
    png += struct.pack('>I', ihdr_len) + ihdr_type + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # IDAT chunk
    # Raw data: each row starts with filter byte 0, followed by RGB triples
    # Color: #4A90E2 (74, 144, 226) - Blue
    row_data = b'\x00' + (b'\x4a\x90\xe2' * width)
    raw_data = b''.join([row_data for _ in range(height)])
    
    compressed = zlib.compress(raw_data)
    idat_len = len(compressed)
    idat_type = b'IDAT'
    idat_crc = zlib.crc32(idat_type + compressed)
    png += struct.pack('>I', idat_len) + idat_type + compressed + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_data = b''
    iend_len = 0
    iend_type = b'IEND'
    iend_crc = zlib.crc32(iend_type + iend_data)
    png += struct.pack('>I', iend_len) + iend_type + iend_data + struct.pack('>I', iend_crc)
    
    return png

try:
    with open('assets/icon.png', 'wb') as f:
        f.write(make_png(512, 512))
    print("Successfully generated assets/icon.png")
except Exception as e:
    print(f"Error generating icon: {e}")
