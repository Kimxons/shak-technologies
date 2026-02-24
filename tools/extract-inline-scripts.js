#!/usr/bin/env node
/*
Extract inline <script> blocks from HTML files under public/modules into
public/assets/js/pages/<module>/... and replace them with external <script src="...">.

- Skips scripts that already have src=
- Skips non-JS script types (application/json, ld+json, etc.)
- Writes extracted files with suffix ".embedded-<n>.js" (or ".embedded.js" if only one)
*/

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();

function posixify(p) {
  return p.split(path.sep).join('/');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function walkFiles(startDir, predicate) {
  const results = [];
  const stack = [startDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        if (!predicate || predicate(fullPath)) results.push(fullPath);
      }
    }
  }
  return results;
}

function isSkippableScriptTag(openTag) {
  // Skip if src is present
  if (/\bsrc\s*=\s*['"]/i.test(openTag)) return true;

  // If type exists and is clearly not JS, skip
  const typeMatch = openTag.match(/\btype\s*=\s*(['"])(.*?)\1/i);
  if (typeMatch) {
    const type = String(typeMatch[2]).trim().toLowerCase();
    const isJsLike =
      type === '' ||
      type.includes('javascript') ||
      type === 'module' ||
      type === 'text/module';

    if (!isJsLike) return true;
  }

  return false;
}

function extractInlineScriptsFromHtml(htmlText) {
  // Match <script ...> ... </script> including attributes
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  const scripts = [];

  while ((match = scriptRegex.exec(htmlText)) !== null) {
    const full = match[0];
    const attrs = match[1] || '';
    const body = match[2] || '';

    if (isSkippableScriptTag(attrs)) continue;

    // Ignore empty/whitespace-only bodies
    if (!body.trim()) continue;

    scripts.push({ full, attrs, body });
  }

  return scripts;
}

function computeModuleName(htmlAbsPath) {
  // Expect .../public/modules/<module>/...
  const rel = posixify(path.relative(repoRoot, htmlAbsPath));
  const parts = rel.split('/');
  const publicIdx = parts.indexOf('public');
  const modulesIdx = parts.indexOf('modules');
  if (publicIdx === -1 || modulesIdx === -1 || modulesIdx + 1 >= parts.length) {
    return null;
  }
  return parts[modulesIdx + 1];
}

function run() {
  const modulesDir = path.join(repoRoot, 'public', 'modules');
  const pagesDir = path.join(repoRoot, 'public', 'assets', 'js', 'pages');

  if (!fs.existsSync(modulesDir)) {
    console.error(`Missing directory: ${modulesDir}`);
    process.exit(1);
  }

  const htmlFiles = walkFiles(modulesDir, (p) => p.toLowerCase().endsWith('.html'));

  let filesChanged = 0;
  let scriptsExtracted = 0;
  const changedFiles = [];

  for (const htmlFile of htmlFiles) {
    const original = fs.readFileSync(htmlFile, 'utf8');
    const scripts = extractInlineScriptsFromHtml(original);

    if (!scripts.length) continue;

    const moduleName = computeModuleName(htmlFile);
    if (!moduleName) continue;

    const htmlRelFromModules = posixify(path.relative(path.join(repoRoot, 'public', 'modules', moduleName), htmlFile));
    const htmlDirRelFromModules = posixify(path.dirname(htmlRelFromModules));
    const baseName = path.basename(htmlFile, path.extname(htmlFile));

    // Output folder mirrors module + html subfolders
    const outDir = path.join(pagesDir, moduleName, htmlDirRelFromModules === '.' ? '' : htmlDirRelFromModules);
    ensureDir(outDir);

    let updated = original;
    const refs = [];

    scripts.forEach((script, idx) => {
      const isOnlyOne = scripts.length === 1;
      const outFileName = isOnlyOne
        ? `${baseName}.embedded.js`
        : `${baseName}.embedded-${idx + 1}.js`;

      const outAbsPath = path.join(outDir, outFileName);
      const jsContent = `${script.body.trim()}\n`;

      // Don’t overwrite if identical; overwrite otherwise.
      let write = true;
      if (fs.existsSync(outAbsPath)) {
        const existing = fs.readFileSync(outAbsPath, 'utf8');
        if (existing === jsContent) write = false;
      }
      if (write) fs.writeFileSync(outAbsPath, jsContent, 'utf8');

      // Compute HTML-relative src
      const srcRel = posixify(path.relative(path.dirname(htmlFile), outAbsPath));

      // If the inline script was in <head>, keep defer attribute (best-effort)
      const scriptPos = updated.indexOf(script.full);
      const headClosePos = updated.toLowerCase().indexOf('</head>');
      const inHead = headClosePos !== -1 && scriptPos !== -1 && scriptPos < headClosePos;

      const replacement = inHead
        ? `<script defer src="${srcRel}"></script>`
        : `<script src="${srcRel}"></script>`;

      updated = updated.replace(script.full, replacement);
      refs.push({ outAbsPath, srcRel });
      scriptsExtracted += 1;
    });

    if (updated !== original) {
      fs.writeFileSync(htmlFile, updated, 'utf8');
      filesChanged += 1;
      changedFiles.push(posixify(path.relative(repoRoot, htmlFile)));
    }
  }

  console.log(JSON.stringify({ filesChanged, scriptsExtracted, changedFiles }, null, 2));
}

run();
