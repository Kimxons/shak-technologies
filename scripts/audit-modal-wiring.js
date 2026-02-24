/*
  Quick integrity check:
  - Extract modalId values from public/assets/js/app.js
  - Verify they exist as id="..." in public/dashboard.html

  Usage:
    node scripts/audit-modal-wiring.js
*/

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appPath = path.join(root, 'public', 'assets', 'js', 'app.js');
const dashboardPath = path.join(root, 'public', 'dashboard.html');

const appText = fs.readFileSync(appPath, 'utf8');
const dashText = fs.readFileSync(dashboardPath, 'utf8');

const modalIdRegex = /modalId\s*:\s*['"]([^'"]+)['"]/g;
const ids = new Set();

let match;
while ((match = modalIdRegex.exec(appText))) {
  const id = match[1].trim();
  if (id) ids.add(id);
}

const all = [...ids].sort();
const missing = all.filter((id) => !dashText.includes(`id="${id}"`));

console.log('ModalIds in app.js:', all.length);
console.log('Missing in dashboard.html:', missing.length);
if (missing.length) {
  for (const id of missing) console.log(' -', id);
  process.exitCode = 1;
}
