#!/usr/bin/env node
/* Rebuilds content/_index/<folder>.json from what is actually on disk.
   The index files live outside the collection folders because Decap treats
   every .json inside a folder collection as an entry.
   Run locally, or set it as the Netlify build command. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'content');
const out = path.join(root, '_index');
fs.mkdirSync(out, { recursive: true });
['countries', 'guides', 'properties'].forEach(function (dir) {
  const d = path.join(root, dir);
  if (!fs.existsSync(d)) return;
  const names = fs.readdirSync(d)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''))
    .sort();
  fs.writeFileSync(path.join(out, dir + '.json'), JSON.stringify(names, null, 2) + '\n');
  console.log(dir + ': ' + names.length);
});
