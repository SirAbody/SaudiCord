#!/usr/bin/env python3
"""
Replace red color in avatar URLs with green color
"""

import os
import re

def replace_avatar_colors_in_file(filepath):
    """Replace FF0000 with 53FC18 in avatar URLs."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Replace FF0000 (red) with 53FC18 (green) in avatar URLs
        content = content.replace('background=FF0000', 'background=53FC18')
        
        # If changes were made, write back to file
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def process_directory(directory):
    """Process all JavaScript files in the directory."""
    files_changed = 0
    files_processed = 0
    
    for root, dirs, files in os.walk(directory):
        # Skip node_modules and build directories
        if 'node_modules' in root or 'build' in root or '.git' in root:
            continue
            
        for file in files:
            if file.endswith('.js') or file.endswith('.jsx'):
                filepath = os.path.join(root, file)
                files_processed += 1
                
                if replace_avatar_colors_in_file(filepath):
                    files_changed += 1
                    print(f"✅ Updated avatar colors in: {filepath}")
    
    return files_processed, files_changed

if __name__ == "__main__":
    client_dir = r"c:\Users\Administrator.MADEBYABODY\Desktop\SaudiCord\client\src"
    
    print("🎨 Replacing avatar background colors...")
    files_processed, files_changed = process_directory(client_dir)
    print(f"✅ Complete! Updated {files_changed} files.")
