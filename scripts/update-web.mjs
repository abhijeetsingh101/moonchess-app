// Copies the latest MoonChess website into the app and re-applies the app-only changes.
// Usage:  node scripts/update-web.mjs <path-to-website-folder>
// The website folder is the one that holds index.html, css/ and js/ (your moonchess repo).
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src || !fs.existsSync(path.join(src, 'index.html'))) {
  console.error('Give the path to the website folder, e.g.  node scripts/update-web.mjs ../moonchess');
  process.exit(1);
}
const www = path.resolve('www');
const copy = (rel) => {
  fs.mkdirSync(path.dirname(path.join(www, rel)), { recursive: true });
  fs.copyFileSync(path.join(src, rel), path.join(www, rel));
  console.log('updated', rel);
};
copy('css/app.css');
for (const f of fs.readdirSync(path.join(src, 'js'))) if (f.endsWith('.js')) copy('js/' + f);

let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const swap = (from, to, label) => {
  if (!from.test(html)) { console.error('Could not find ' + label + ' in index.html; check it by hand.'); process.exit(1); }
  html = html.replace(from, to);
};
html = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/, '');
swap(/<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet">/, '<link rel="stylesheet" href="css/fonts.css">', 'the Google Fonts link');
swap(/<link rel="stylesheet" href="css\/app\.css">/, '<link rel="stylesheet" href="css/app.css">\n<link rel="stylesheet" href="css/native.css">', 'the app.css link');
swap(/content="width=device-width,initial-scale=1(,viewport-fit=cover)?"/, 'content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"', 'the viewport tag');
swap(/<meta name="viewport"/, '<meta name="theme-color" content="#070a1f">\n<meta name="color-scheme" content="dark">\n<meta name="viewport"', 'the viewport tag');
swap(/<script src="js\/app\.js"><\/script>/, '<script src="js/app.js"></script>\n<script src="js/native.js"></script>', 'the app.js script');
fs.writeFileSync(path.join(www, 'index.html'), html);
console.log('updated index.html');
console.log('Done. Commit and push to GitHub to build a new APK.');
