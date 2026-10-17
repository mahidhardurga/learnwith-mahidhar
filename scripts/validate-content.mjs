// Checks the lesson data files against the markdown: every key must point at a real page or heading.
import fs from 'fs';
import path from 'path';

const pages = JSON.parse(fs.readFileSync('src/data/pages.json', 'utf8'));
const slots = JSON.parse(fs.readFileSync('src/data/section-slots.json', 'utf8'));
const lessons = JSON.parse(fs.readFileSync('src/data/lessons.json', 'utf8'));
const known = new Set(pages.map((p) => p.path));

const CANON = /^(common interview questions|pitfalls?|common mistakes|try it|check yourself|key takeaways?)/i;
const plain = (t) => t.replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();

function mdFor(p) {
  const rel = p.slice(1);
  const a = path.join('docs', rel + '.md');
  return fs.existsSync(a) ? a : path.join('docs', rel, path.basename(rel) + '.md');
}

let problems = 0;
const report = (msg) => {
  console.log(msg);
  problems++;
};

for (const p of [...Object.keys(slots), ...Object.keys(lessons)]) {
  if (!known.has(p)) report(`UNKNOWN PAGE  ${p}`);
}

for (const pg of pages) {
  const file = mdFor(pg.path);
  if (!fs.existsSync(file)) {
    report(`MISSING FILE  ${pg.path}`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  let fence = false;
  const heads = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) fence = !fence;
    if (!fence && line.startsWith('## ')) heads.push(plain(line.slice(3)));
  }
  for (const [key, slot] of Object.entries(slots[pg.path] ?? {})) {
    if (!heads.includes(key) && !key.endsWith('*')) report(`UNUSED SLOT   ${pg.path}  "${key}"`);
    if (!Number.isInteger(slot) || slot < 1 || slot > 10 || CANON.test(key)) report(`BAD SLOT      ${pg.path}  "${key}" -> ${slot}`);
  }
  const lesson = lessons[pg.path];
  if (lesson && !(lesson.def && lesson.why)) report(`INCOMPLETE    ${pg.path} needs def and why`);
}

console.log('problems:', problems, '| pages:', pages.length, '| lessons:', Object.keys(lessons).length);
process.exit(problems ? 1 : 0);
