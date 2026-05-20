import fs from 'fs';
import path from 'path';

const rootDir = path.resolve('.');
const outputFile = path.resolve('all_project_code.txt');

// Files and directories to exclude
const excludeList = ['node_modules', 'dist', '.git', 'package-lock.json', 'all_project_code.txt', 'public', '.DS_Store'];

// Valid extensions to include
const validExtensions = ['.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.json', '.md'];

let combinedCode = '';

function traverseDirectory(currentPath) {
  const items = fs.readdirSync(currentPath);

  for (const item of items) {
    if (excludeList.includes(item)) continue;
    if (item.endsWith('.pdf') || item.endsWith('.png') || item.endsWith('.xlsx')) continue;

    const fullPath = path.join(currentPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      traverseDirectory(fullPath);
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (validExtensions.includes(ext) || ext === '') {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          combinedCode += `\n\n=======================================================\n`;
          combinedCode += `FILE: ${path.relative(rootDir, fullPath)}\n`;
          combinedCode += `=======================================================\n\n`;
          combinedCode += content;
        } catch (err) {
          console.error(`Could not read file: ${fullPath}`, err);
        }
      }
    }
  }
}

traverseDirectory(rootDir);

fs.writeFileSync(outputFile, combinedCode.trim());
console.log(`✅ Successfully bundled all project code into: ${outputFile}`);
