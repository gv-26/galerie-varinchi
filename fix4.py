import os
import re

# Fix add-product/page.tsx handleImageUpload
path = "d:/projects/galerievarinchie_artist/src/app/admin/add-product/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace <input type="file" ... onChange={handleImageUpload} />
# and {uploading && ...}
content = re.sub(r'<div style={{ display: \'flex\', gap: \'var\(--space-md\)\', alignItems: \'center\' }}>\s*<input type="file"[^>]*onChange={handleImageUpload}[^>]*>\s*\{uploading && <span className="spinner"></span>\}\s*</div>', '', content)

# Remove the remaining images picker UI since it's not needed
content = re.sub(r'\{/\* Pick from Frame Composer \*/\}[\s\S]*?\{images\.length > 0 && \([\s\S]*?\}\)\]}\s*</div>\s*\)\}', '', content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

# Fix frame-composer/page.tsx toggleFrameSelection
fc_path = "d:/projects/galerievarinchie_artist/src/app/admin/frame-composer/page.tsx"
with open(fc_path, "r", encoding="utf-8") as f:
    fc_content = f.read()

fc_content = fc_content.replace('toggleFrameSelection(frame.id);', 'setSelectedFrameIds(prev => { const next = new Set(prev); if (next.has(frame.id)) next.delete(frame.id); else next.add(frame.id); return next; });')

with open(fc_path, "w", encoding="utf-8") as f:
    f.write(fc_content)

print("Fixed!")
