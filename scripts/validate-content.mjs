// Checks the lesson data files against the markdown: every key must point at a real page.
import fs from 'fs';
import path from 'path';

const pages = JSON.parse(fs.readFileSync('src/data/pages.json', 'utf8'));
const lessons = JSON.parse(fs.readFileSync('src/data/lessons.json', 'utf8'));

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

for (const p of Object.keys(lessons)) {
  if (!fs.existsSync(mdFor(p))) report(`UNKNOWN PAGE  ${p}`);
}

for (const pg of pages) {
  const file = mdFor(pg.path);
  if (!fs.existsSync(file)) {
    report(`MISSING FILE  ${pg.path}`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const lesson = lessons[pg.path];
  if (lesson && !lesson.def) report(`INCOMPLETE    ${pg.path} needs def`);
}

console.log('problems:', problems, '| pages:', pages.length, '| lessons:', Object.keys(lessons).length);
process.exit(problems ? 1 : 0);
