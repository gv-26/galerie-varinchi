const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  let files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

const apiDir = path.join(__dirname, 'src', 'app', 'api');
const files = getAllFiles(apiDir).filter(f => f.endsWith('route.ts'));

console.log(`Found ${files.length} route.ts files.`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  if (!content.includes("export const dynamic = 'force-dynamic'") && !content.includes('export const dynamic = "force-dynamic"')) {
    // Insert at the very top (or after directives)
    content = `export const dynamic = 'force-dynamic';\n` + content;
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated: ${file}`);
  } else {
    console.log(`Skipped: ${file} (Already has force-dynamic)`);
  }
});

console.log("Done!");
