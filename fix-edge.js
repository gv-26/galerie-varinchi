const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/app/admin/artists/requests/[id]/page.tsx',
  'src/app/admin/artwork-requests/[id]/page.tsx',
  'src/app/admin/content/page.tsx',
  'src/app/admin/orders/page.tsx',
  'src/app/admin/page.tsx',
  'src/app/artist/dashboard/page.tsx',
  'src/app/artist/signup/page.tsx',
  'src/app/artist/submit-art/page.tsx',
  'src/app/category/[slug]/[subSlug]/page.tsx',
  'src/app/category/[slug]/page.tsx',
  'src/app/product/[id]/page.tsx',
  'src/app/profile/page.tsx',
  'src/app/wishlist/page.tsx',
];

for (const relPath of filesToFix) {
  const fullPath = path.join(__dirname, relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Remove the previously injected line
    content = content.replace("export const runtime = 'edge';\n", "");
    content = content.replace('export const runtime = "edge";\n', "");

    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find 'use client' or similar directives
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("'use client'") || lines[i].includes('"use client"') || lines[i].includes("dynamic = 'force-dynamic'")) {
        insertIndex = i + 1;
        // Keep looking in case force-dynamic is lower than use client
      }
    }
    
    lines.splice(insertIndex, 0, "export const runtime = 'edge';");
    fs.writeFileSync(fullPath, lines.join('\n'));
    console.log('Fixed directive order:', relPath);
  }
}
