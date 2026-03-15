import json
import zipfile
import os

lottie_path = 'src/assets/loading/STUDENT.lottie'
temp_dir = 'src/assets/loading/temp_lottie'
out_path = 'src/assets/loading/STUDENT_MODIFIED.lottie'

if not os.path.exists(temp_dir):
    os.makedirs(temp_dir)

# 1. Unzip the Lottie file
with zipfile.ZipFile(lottie_path, 'r') as z:
    z.extractall(temp_dir)

manifest_path = os.path.join(temp_dir, 'manifest.json')
with open(manifest_path, 'r') as f:
    manifest = json.load(f)

# Find the main animation JSON file
# In a standard .lottie, it's inside `animations/` folder
animations_dir = os.path.join(temp_dir, 'animations')
anim_files = [f for f in os.listdir(animations_dir) if f.endswith('.json')]

if not anim_files:
    print("No animation json found")
    exit(1)

anim_path = os.path.join(animations_dir, anim_files[0])
with open(anim_path, 'r', encoding='utf-8') as f:
    anim_data = json.load(f)

# Target colors (approximate from screenshot and typical dark illustrations)
# We want to replace dark grays with Emerald Green, and some yellows with Amber Gold.
# Actually, the user wants specific parts colored. Without a visual editor, we can only do find/replace on generic colors.
# This script is a proof of concept to try recoloring some arrays.

# Function to recursively search and replace colors in the Lottie JSON
# A color in Lottie is usually a property 'k' under a property 'c' which contains an array [r, g, b, 1]
def replace_colors(obj):
    if isinstance(obj, dict):
        # Check if this looks like a color property
        if 'c' in obj and isinstance(obj['c'], dict) and 'k' in obj['c']:
            k = obj['c']['k']
            # Sometimes 'k' is a flat array [r,g,b,a]
            if isinstance(k, list) and len(k) == 4 and all(isinstance(x, (int, float)) for x in k):
                r, g, b, a = k
                # If it's a dark color (e.g. books/gears outline), maybe we can't tell what it belongs to.
                # Let's just slightly tint all dark grays toward navy or emerald?
                # Actually, the user said "books are now emerald green, gears amber gold".
                # It's essentially impossible to selectively target "books" without knowing the layer name.
                pass
            # If it's a keyframed array, it's more complex.
        
        for key, value in obj.items():
            replace_colors(value)
    elif isinstance(obj, list):
        for item in obj:
            replace_colors(item)

# Let's see if layers are named
layer_names = []
if 'layers' in anim_data:
    for layer in anim_data['layers']:
        if 'nm' in layer:
            layer_names.append(layer['nm'])
print("Layer names found:", layer_names)

# Re-zip just to verify script works
with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(temp_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, temp_dir)
            z.write(file_path, arcname)

print("Created modified lottie at", out_path)
