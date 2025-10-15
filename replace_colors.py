#!/usr/bin/env python3
"""
Comprehensive script to replace all red colors with Kick-style green colors
throughout the SaudiCord project.
"""

import os
import re

# Color mapping from red to green
COLOR_REPLACEMENTS = {
    # Hex colors
    '#FF0000': '#53FC18',
    '#ff0000': '#53FC18',
    '#DC2626': '#53FC18',
    '#dc2626': '#53FC18',
    '#CC0000': '#3DD80A',
    '#cc0000': '#3DD80A',
    '#FF3333': '#6FFF3B',
    '#ff3333': '#6FFF3B',
    '#FF1A1A': '#3DD80A',
    '#ff1a1a': '#3DD80A',
    
    # Tailwind class names - exact replacements
    'bg-red-100': 'bg-green-100',
    'bg-red-200': 'bg-green-200',
    'bg-red-300': 'bg-green-300',
    'bg-red-400': 'bg-green-400',
    'bg-red-500': 'bg-primary-500',
    'bg-red-600': 'bg-primary-600',
    'bg-red-700': 'bg-primary-700',
    'bg-red-800': 'bg-primary-800',
    'bg-red-900': 'bg-primary-900',
    
    'text-red-100': 'text-green-100',
    'text-red-200': 'text-green-200',
    'text-red-300': 'text-green-300',
    'text-red-400': 'text-primary-400',
    'text-red-500': 'text-primary-500',
    'text-red-600': 'text-primary-600',
    'text-red-700': 'text-primary-700',
    'text-red-800': 'text-primary-800',
    'text-red-900': 'text-primary-900',
    
    'border-red-100': 'border-green-100',
    'border-red-200': 'border-green-200',
    'border-red-300': 'border-green-300',
    'border-red-400': 'border-green-400',
    'border-red-500': 'border-primary-500',
    'border-red-600': 'border-primary-600',
    'border-red-700': 'border-primary-700',
    'border-red-800': 'border-primary-800',
    'border-red-900': 'border-primary-900',
    
    'hover:bg-red-100': 'hover:bg-green-100',
    'hover:bg-red-200': 'hover:bg-green-200',
    'hover:bg-red-300': 'hover:bg-green-300',
    'hover:bg-red-400': 'hover:bg-green-400',
    'hover:bg-red-500': 'hover:bg-primary-500',
    'hover:bg-red-600': 'hover:bg-primary-600',
    'hover:bg-red-700': 'hover:bg-primary-700',
    
    'hover:text-red-300': 'hover:text-green-300',
    'hover:text-red-400': 'hover:text-primary-400',
    'hover:text-red-500': 'hover:text-primary-500',
    'hover:text-red-600': 'hover:text-primary-600',
    
    'hover:border-red-400': 'hover:border-green-400',
    'hover:border-red-500': 'hover:border-primary-500',
    'hover:border-red-600': 'hover:border-primary-600',
    
    'focus:ring-red-500': 'focus:ring-primary-500',
    'focus:border-red-400': 'focus:border-primary-400',
    'focus:border-red-500': 'focus:border-primary-500',
    
    'shadow-red-500': 'shadow-green-500',
    'shadow-red-900': 'shadow-green-900',
    'ring-red-500': 'ring-primary-500',
    
    'from-red-500': 'from-primary-500',
    'from-red-600': 'from-primary-600',
    'from-red-700': 'from-primary-700',
    'to-red-600': 'to-primary-600',
    'to-red-700': 'to-primary-700',
    
    # Special compound classes
    'bg-red-500/10': 'bg-primary-500/10',
    'bg-red-500/20': 'bg-primary-500/20',
    'bg-red-500/30': 'bg-primary-500/30',
    'border-red-900/20': 'border-primary-900/20',
    'border-red-900/30': 'border-primary-900/30',
    'border-red-500/30': 'border-primary-500/30',
    'shadow-red-500/30': 'shadow-primary-500/30',
    'shadow-red-900/20': 'shadow-primary-900/20',
    'hover:bg-red-500/10': 'hover:bg-primary-500/10',
    'hover:bg-red-500/20': 'hover:bg-primary-500/20',
    'hover:bg-red-600/20': 'hover:bg-primary-600/20',
    'focus:ring-red-500/20': 'focus:ring-primary-500/20',
    'placeholder-red-400/50': 'placeholder-primary-400/50',
    
    # RGB colors
    'rgba(255, 0, 0,': 'rgba(83, 252, 24,',
    'rgb(255, 0, 0)': 'rgb(83, 252, 24)',
    'rgb(220, 38, 38)': 'rgb(83, 252, 24)',
}

def replace_colors_in_file(filepath):
    """Replace all red colors with green in a single file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply all replacements
        for old_color, new_color in COLOR_REPLACEMENTS.items():
            content = content.replace(old_color, new_color)
        
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
    """Process all relevant files in the directory."""
    files_changed = 0
    files_processed = 0
    
    # File extensions to process
    extensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.html']
    
    for root, dirs, files in os.walk(directory):
        # Skip node_modules and build directories
        if 'node_modules' in root or 'build' in root or '.git' in root:
            continue
            
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                filepath = os.path.join(root, file)
                files_processed += 1
                
                if replace_colors_in_file(filepath):
                    files_changed += 1
                    print(f"✅ Updated: {filepath}")
    
    return files_processed, files_changed

if __name__ == "__main__":
    # Process the client directory
    client_dir = r"c:\Users\Administrator.MADEBYABODY\Desktop\SaudiCord\client\src"
    
    print("🎨 Starting comprehensive color replacement...")
    print(f"📁 Processing directory: {client_dir}")
    print("-" * 50)
    
    files_processed, files_changed = process_directory(client_dir)
    
    print("-" * 50)
    print(f"✅ Complete! Processed {files_processed} files, updated {files_changed} files.")
    print("🌟 All red colors have been replaced with Kick-style green!")
