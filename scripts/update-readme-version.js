const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const readmePath = path.join(rootDir, 'README.md');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

const readme = fs.readFileSync(readmePath, 'utf8');
const updated = readme.replace(
  /^#\s+Squiish!\s+v\.[0-9A-Za-z.-]+/m,
  `# Squiish! v.${version}`,
);

if (updated !== readme) {
  fs.writeFileSync(readmePath, updated);
}
