import fs from 'fs';
import path from 'path';
import {SKIP_PAGES, isAlways, lookupOverride, plain, QA_HEADING} from '../plugins/level-classify.mjs';

const pages = JSON.parse(fs.readFileSync('src/data/pages.json', 'utf8'));
const overrides = JSON.parse(fs.readFileSync('src/data/section-overrides.json', 'utf8'));

const notes = JSON.parse(fs.readFileSync('src/data/level-section-notes.json', 'utf8'));
const intros = JSON.parse(fs.readFileSync('src/data/level-intros.json', 'utf8'));
const known = new Set(pages.map((x) => x.path));
let introProblems = 0;
for (const p of [...Object.keys(intros), ...Object.keys(notes)]) {
  if (!known.has(p)) {
    console.log(`UNKNOWN PAGE ${p}`);
    introProblems++;
  }
}

function mdFor(p) {
  const rel = p.slice(1);
  const a = path.join('docs', rel + '.md');
  return fs.existsSync(a) ? a : path.join('docs', rel, path.basename(rel) + '.md');
}

let problems = introProblems;
const counts = {beginner: 0, mid: 0, senior: 0};
for (const pg of pages) {
  if (SKIP_PAGES.has(pg.path)) continue;
  const text = fs.readFileSync(mdFor(pg.path), 'utf8').replace(/\r\n/g, '\n');
  let fence = false;
  const heads = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) fence = !fence;
    if (!fence && line.startsWith('## ')) heads.push(plain(line.slice(3)));
  }
  const ov = overrides[pg.path] ?? {};
  for (const h of heads) {
    if (isAlways(h) || QA_HEADING.test(h)) continue;
    const lvl = lookupOverride(ov, h);
    if (!lvl) {
      console.log(`NO OVERRIDE  ${pg.path}  "${h}"`);
      problems++;
    } else counts[lvl]++;
  }
  for (const key of Object.keys(notes[pg.path] ?? {})) {
    const used = heads.some((h) => h === key || (key.endsWith('*') && h.startsWith(key.slice(0, -1))));
    if (!used) {
      console.log(`UNUSED NOTE  ${pg.path}  "${key}"`);
      problems++;
    }
  }
  for (const key of Object.keys(ov)) {
    const used = heads.some((h) => h === key || (key.endsWith('*') && h.startsWith(key.slice(0, -1))));
    if (!used) {
      console.log(`UNUSED KEY   ${pg.path}  "${key}"`);
      problems++;
    }
  }
}
console.log('problems:', problems, 'section levels:', counts);
