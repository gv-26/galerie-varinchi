const fs = require('fs');
const path = 'd:/projects/galerievarinchie_artist/src/app/admin/add-product/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove handleImageUpload
content = content.replace(/const handleImageUpload = async[\s\S]*?};\n/, '');

// 2. Remove old openFramePicker, togglePickerImage, confirmPickerSelection
content = content.replace(/\/\/ -- Frame Composer Picker Helpers ------------------------------------------[\s\S]*?};\n\n  \/\/ -- Size Helpers ----------------------------------------------------------/, '// -- Size Helpers ----------------------------------------------------------');

// 3. Remove setImages in artist request load
content = content.replace(/const parsedImages = JSON\.parse\(req\.images \|\| \''\[\]\'\);\s*setImages\(parsedImages\);/, '// images not supported in request yet');

// 4. Update the images payload in body
content = content.replace(/image: images\[0\] \|\| '\/images\/placeholder\.jpg',\s*images: JSON\.stringify\(images\),/, 'image: \'/images/placeholder.jpg\', images: JSON.stringify([]),');

// 5. Remove the global image upload UI section
content = content.replace(/<div style=\{\{ display: 'flex', gap: 'var\(--space-md\)', alignItems: 'center' \}\}>[\s\S]*?\{images\.length > 0 && \([\s\S]*?\}\)\]}\s*<\/div>\s*\)\}\s*<\/div>/, '<p className="text-xs text-muted" style={{ marginTop: "4px" }}>Images are managed per combination in the pricing section below.</p>');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed add-product TS errors');
