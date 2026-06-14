const fs = require('fs');
const content = fs.readFileSync('d:/projects/galerievarinchie_artist/src/app/admin/add-product/page.tsx', 'utf8');

let stack = [];
for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '{' || char === '(' || char === '[') {
    stack.push({ char, line: content.substring(0, i).split('\n').length });
  } else if (char === '}' || char === ')' || char === ']') {
    const last = stack.pop();
    if (!last) {
      console.log(`Unmatched closing ${char} at line ${content.substring(0, i).split('\n').length}`);
    } else {
      const match = { '}': '{', ')': '(', ']': '[' };
      if (last.char !== match[char]) {
        console.log(`Mismatched closing ${char} at line ${content.substring(0, i).split('\n').length}, expected closing for ${last.char} from line ${last.line}`);
      }
    }
  }
}
if (stack.length > 0) {
  console.log(`Unclosed symbols:`);
  for (const s of stack) {
    console.log(`  ${s.char} from line ${s.line}`);
  }
} else {
  console.log('All braces matched properly (excluding JSX parsing/string literals)!');
}
