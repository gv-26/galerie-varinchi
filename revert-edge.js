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
  'src/app/api/orders/export/route.ts',
];

for (const relPath of filesToFix) {
  const fullPath = path.join(__dirname, relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace("export const runtime = 'edge';\n", "");
    content = content.replace('export const runtime = "edge";\n', "");
    fs.writeFileSync(fullPath, content);
    console.log('Removed edge runtime:', relPath);
  }
}
