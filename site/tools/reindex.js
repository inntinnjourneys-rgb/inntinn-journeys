#!/usr/bin/env node
/* Rebuilds content/<folder>/_index.json from what is actually on disk.
   Run locally, or set it as the Netlify build command. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'content');
['countries', 'guides', 'properties'].forEach(function (dir) {
  const d = path.join(root, dir);
  if (!fs.existsSync(d)) return;
  const names = fs.readdirSync(d)
    .filter(f => f.endsWith('.json') && f !== '_index.json')
    .map(f => f.replace(/\.json$/, ''))
    .sort();
  fs.writeFileSync(path.join(d, '_index.json'), JSON.stringify(names, null, 2) + '\n');
  console.log(dir + ': ' + names.length);
});
