const fs = require('fs');
const path = require('path');

const makeStaticPaths = [
  'src/app/admin/page.tsx',
  'src/app/admin/content/page.tsx',
  'src/app/admin/orders/page.tsx',
  'src/app/artist/dashboard/page.tsx',
  'src/app/artist/signup/page.tsx',
  'src/app/artist/submit-art/page.tsx',
  'src/app/profile/page.tsx',
  'src/app/wishlist/page.tsx',
];

for (const relPath of makeStaticPaths) {
  const fullPath = path.join(__dirname, relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/export const dynamic = ['"]force-dynamic['"];\n?/g, '');
    content = content.replace(/export const runtime = ['"]edge['"];\n?/g, '');
    fs.writeFileSync(fullPath, content);
  }
}

const addEdgePaths = [
  'src/app/admin/artists/requests/[id]/page.tsx',
  'src/app/admin/artwork-requests/[id]/page.tsx',
  'src/app/category/[slug]/[subSlug]/page.tsx',
  'src/app/category/[slug]/page.tsx',
  'src/app/product/[id]/page.tsx',
  'src/app/api/orders/export/route.ts',
];

for (const relPath of addEdgePaths) {
  const fullPath = path.join(__dirname, relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    // Ensure we don't have it already
    content = content.replace(/export const runtime = ['"]edge['"];\n?/g, '');
    
    // Add right after 'use client' or at top
    const lines = content.split('\n');
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("'use client'") || lines[i].includes('"use client"') || lines[i].includes("dynamic = ")) {
        insertIndex = i + 1;
      }
    }
    lines.splice(insertIndex, 0, "export const runtime = 'edge';");
    fs.writeFileSync(fullPath, lines.join('\n'));
  }
}
