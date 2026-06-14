const fs = require('fs');
const { execSync } = require('child_process');

try {
  // Get original file from HEAD
  const original = execSync('git show HEAD:src/app/admin/add-product/page.tsx', { encoding: 'utf8' });
  
  let content = original;

  // 1. Remove global image handling
  content = content.replace(/const parsedImages = JSON\.parse\(req\.images \|\| \''\[\]\'\);\s*setImages\(parsedImages\);/, '// images via request not fully supported per-combo yet');
  
  // 2. Remove handleImageUpload
  content = content.replace(/const handleImageUpload = async[\s\S]*?};\n/, '');

  // 3. Remove old openFramePicker block (lines 284-320 roughly)
  content = content.replace(/\/\/ -- Frame Composer Picker Helpers ------------------------------------------[\s\S]*?};\n\n  \/\/ -- Size Helpers ----------------------------------------------------------/, '// -- Size Helpers ----------------------------------------------------------');

  // 4. Update the images payload in body
  content = content.replace(/image: images\[0\] \|\| '\/images\/placeholder\.jpg',\s*images: JSON\.stringify\(images\),/, 'image: \'/images/placeholder.jpg\', images: JSON.stringify([]),');

  // 5. Update Product Images form group (remove old global upload + picker)
  const productImagesStart = content.indexOf('<label>Product Images</label>');
  if (productImagesStart !== -1) {
    const productImagesEnd = content.indexOf('</div>\n            </div>\n\n            {/* -- Pricing Mode Toggle -- */}');
    if (productImagesEnd !== -1) {
      const before = content.substring(0, productImagesStart);
      const after = content.substring(productImagesEnd);
      const replacement = '<label>Product Images</label>\n                <p className="text-xs text-muted" style={{ marginTop: \'4px\' }}>Images are uploaded per combination below in the Pricing section. Select a combination row to manage its images.</p>\n              ';
      content = before + replacement + after;
    }
  }

  fs.writeFileSync('src/app/admin/add-product/page.tsx', content, 'utf8');
  console.log('Restored and fixed add-product/page.tsx');
} catch (e) {
  console.error(e);
}
