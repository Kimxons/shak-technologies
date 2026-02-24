/*
  Quick integrity check:
  - Scan public/dashboard.html for duplicate id="..." attributes

  Usage:
    node scripts/audit-dashboard-duplicate-ids.js
*/

const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, '..', 'public', 'dashboard.html');
const text = fs.readFileSync(dashboardPath, 'utf8');

const idRegex = /\bid=\"([^\"]+)\"/g;
const occurrences = new Map();

// Precompute newline offsets for fast index->line mapping.
const newlineOffsets = [0];
for (let i = 0; i < text.length; i++) {
  if (text.charCodeAt(i) === 10) newlineOffsets.push(i + 1);
}

function indexToLine(index) {
  // Binary search for last newline offset <= index
  let low = 0;
  let high = newlineOffsets.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (newlineOffsets[mid] <= index) low = mid + 1;
    else high = mid - 1;
  }
  // line numbers are 1-based
  return high + 1;
}

let match;
while ((match = idRegex.exec(text))) {
  const id = match[1];
  const line = indexToLine(match.index);
  const list = occurrences.get(id) || [];
  list.push(line);
  occurrences.set(id, list);
}

const duplicates = [...occurrences.entries()]
  .filter(([, lines]) => lines.length > 1)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

console.log('Duplicate id attributes in dashboard.html:', duplicates.length);
if (duplicates.length) {
  for (const [id, lines] of duplicates.slice(0, 200)) {
    console.log(` - ${id} x${lines.length} (lines: ${lines.join(', ')})`);
  }
  process.exitCode = 1;
}
