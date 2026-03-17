// Updated seed script with dynamic Category and SubCategory support
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
const db = new Database(dbPath);

console.log('🌱 Seeding database...');

// Create admin user
const adminId = randomUUID();
const adminExists = db.prepare('SELECT id FROM User WHERE email = ?').get('admin@galerievarinchie.com');
if (!adminExists) {
  db.prepare(
    'INSERT INTO User (id, email, name, isAdmin, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(adminId, 'admin@galerievarinchie.com', 'Admin', 1, new Date().toISOString());
  console.log('✅ Admin user created');
} else {
  console.log('✅ Admin user already exists');
}

// Categories and subcategories
const categoryData = [
  {
    name: 'Art Prints',
    slug: 'art-prints',
    displayOrder: 0,
    subCategories: [
      { name: 'Abstract', slug: 'abstract', displayOrder: 0 },
      { name: 'Botanical', slug: 'botanical', displayOrder: 1 },
    ],
  },
  {
    name: 'Mixed Media',
    slug: 'mixed-media',
    displayOrder: 1,
    subCategories: [
      { name: 'Collage', slug: 'collage', displayOrder: 0 },
      { name: 'Textile', slug: 'textile', displayOrder: 1 },
    ],
  },
  {
    name: 'Photograph Print',
    slug: 'photograph-print',
    displayOrder: 2,
    subCategories: [
      { name: 'Urban', slug: 'urban', displayOrder: 0 },
      { name: 'Nature', slug: 'nature', displayOrder: 1 },
    ],
  },
  {
    name: 'Handmade Art',
    slug: 'handmade-art',
    displayOrder: 3,
    subCategories: [
      { name: 'Weaving', slug: 'weaving', displayOrder: 0 },
      { name: 'Ceramics', slug: 'ceramics', displayOrder: 1 },
    ],
  },
];

// Clear existing data
db.prepare('DELETE FROM Product').run();
db.prepare('DELETE FROM SubCategory').run();
db.prepare('DELETE FROM Category').run();

const insertCategory = db.prepare(
  'INSERT INTO Category (id, name, slug, displayOrder, createdAt) VALUES (?, ?, ?, ?, ?)'
);
const insertSubCategory = db.prepare(
  'INSERT INTO SubCategory (id, name, slug, categoryId, displayOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
);

const categoryIds = {};
const subCategoryIds = {};

for (const cat of categoryData) {
  const catId = randomUUID();
  categoryIds[cat.slug] = catId;
  insertCategory.run(catId, cat.name, cat.slug, cat.displayOrder, new Date().toISOString());
  console.log(`✅ Category: ${cat.name}`);

  for (const sub of cat.subCategories) {
    const subId = randomUUID();
    subCategoryIds[`${cat.slug}/${sub.slug}`] = subId;
    insertSubCategory.run(subId, sub.name, sub.slug, catId, sub.displayOrder, new Date().toISOString());
    console.log(`  ✅ SubCategory: ${sub.name}`);
  }
}

// Products data mapped to subcategories
const products = [
  {
    title: 'Ethereal Dawn',
    description: 'A breathtaking sunrise captured in vivid watercolors, blending warm oranges with soft purples.',
    image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=800&fit=crop',
    subCategoryKey: 'art-prints/abstract',
    mediums: JSON.stringify(['canvas', 'paper']),
    frameTypes: JSON.stringify(['teakwood', 'metal', 'colored']),
    frameColors: JSON.stringify(['#FAF0E6', '#36454F', '#800020', '#000080', '#228B22', '#CFB53B']),
    basePrice: 3500,
    priceModifiers: JSON.stringify({ medium: { canvas: 500, paper: 0 }, frameType: { teakwood: 1200, metal: 800, colored: 600 } }),
    unitsAvailable: null,
  },
  {
    title: 'Urban Geometry',
    description: 'An abstract exploration of city architecture, rendered in bold geometric shapes.',
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=800&fit=crop',
    subCategoryKey: 'art-prints/abstract',
    mediums: JSON.stringify(['canvas', 'paper']),
    frameTypes: JSON.stringify(['teakwood', 'metal', 'colored']),
    frameColors: JSON.stringify(['#FAF0E6', '#36454F', '#800020', '#000080']),
    basePrice: 4200,
    priceModifiers: JSON.stringify({ medium: { canvas: 500, paper: 0 }, frameType: { teakwood: 1200, metal: 800, colored: 600 } }),
    unitsAvailable: null,
  },
  {
    title: 'Botanical Whispers',
    description: 'Delicate botanical illustrations featuring native wildflowers.',
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=600&h=800&fit=crop',
    subCategoryKey: 'art-prints/botanical',
    mediums: JSON.stringify(['canvas', 'paper']),
    frameTypes: JSON.stringify(['teakwood', 'metal']),
    frameColors: JSON.stringify([]),
    basePrice: 2800,
    priceModifiers: JSON.stringify({ medium: { canvas: 500, paper: 0 }, frameType: { teakwood: 1200, metal: 800 } }),
    unitsAvailable: null,
  },
  {
    title: 'Layered Memories',
    description: 'A mixed media collage combining vintage photographs, handwritten letters, and acrylic paint.',
    image: 'https://images.unsplash.com/photo-1578926288207-a90a5366759d?w=600&h=800&fit=crop',
    subCategoryKey: 'mixed-media/collage',
    mediums: JSON.stringify([]),
    frameTypes: JSON.stringify([]),
    frameColors: JSON.stringify([]),
    basePrice: 8500,
    priceModifiers: JSON.stringify({}),
    unitsAvailable: 3,
  },
  {
    title: 'Textured Horizon',
    description: 'Combining sand, fabric, and oil paint to create a three-dimensional landscape.',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=800&fit=crop',
    subCategoryKey: 'mixed-media/textile',
    mediums: JSON.stringify([]),
    frameTypes: JSON.stringify([]),
    frameColors: JSON.stringify([]),
    basePrice: 12000,
    priceModifiers: JSON.stringify({}),
    unitsAvailable: 2,
  },
  {
    title: 'Silent Streets',
    description: 'A hauntingly beautiful black-and-white photograph of empty city streets at dawn.',
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&h=800&fit=crop',
    subCategoryKey: 'photograph-print/urban',
    mediums: JSON.stringify(['canvas', 'paper']),
    frameTypes: JSON.stringify(['teakwood', 'metal', 'colored']),
    frameColors: JSON.stringify(['#FAF0E6', '#36454F', '#000080']),
    basePrice: 2200,
    priceModifiers: JSON.stringify({ medium: { canvas: 400, paper: 0 }, frameType: { teakwood: 1000, metal: 700, colored: 500 } }),
    unitsAvailable: null,
  },
  {
    title: 'Ocean Fragments',
    description: 'An aerial photograph of waves breaking against a rocky coastline.',
    image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&h=800&fit=crop',
    subCategoryKey: 'photograph-print/nature',
    mediums: JSON.stringify(['canvas', 'paper']),
    frameTypes: JSON.stringify(['teakwood', 'metal']),
    frameColors: JSON.stringify([]),
    basePrice: 2800,
    priceModifiers: JSON.stringify({ medium: { canvas: 400, paper: 0 }, frameType: { teakwood: 1000, metal: 700 } }),
    unitsAvailable: null,
  },
  {
    title: 'Woven Dreams',
    description: 'A hand-woven textile art piece using natural fibers dyed with traditional botanical dyes.',
    image: 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=600&h=800&fit=crop',
    subCategoryKey: 'handmade-art/weaving',
    mediums: JSON.stringify([]),
    frameTypes: JSON.stringify([]),
    frameColors: JSON.stringify([]),
    basePrice: 15000,
    priceModifiers: JSON.stringify({}),
    unitsAvailable: 1,
  },
  {
    title: 'Ceramic Contemplation',
    description: 'A handcrafted ceramic sculpture that captures the essence of meditation and stillness.',
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=800&fit=crop',
    subCategoryKey: 'handmade-art/ceramics',
    mediums: JSON.stringify([]),
    frameTypes: JSON.stringify([]),
    frameColors: JSON.stringify([]),
    basePrice: 9800,
    priceModifiers: JSON.stringify({}),
    unitsAvailable: 4,
  },
];

const insertProduct = db.prepare(`
  INSERT INTO Product (id, title, description, image, subCategoryId, status, mediums, frameTypes, frameColors, basePrice, priceModifiers, unitsAvailable, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const p of products) {
  const subCatId = subCategoryIds[p.subCategoryKey];
  if (!subCatId) {
    console.error(`❌ No subCategory found for key: ${p.subCategoryKey}`);
    continue;
  }
  insertProduct.run(
    randomUUID(),
    p.title,
    p.description,
    p.image,
    subCatId,
    'active',
    p.mediums,
    p.frameTypes,
    p.frameColors,
    p.basePrice,
    p.priceModifiers,
    p.unitsAvailable,
    new Date().toISOString()
  );
  console.log(`✅ Created: ${p.title}`);
}

console.log(`\n🎉 Seeded ${categoryData.length} categories, subcategories, and ${products.length} products`);
db.close();
