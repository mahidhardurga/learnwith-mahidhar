// Rehype plugin: wraps each H2 section (and each interview question) of a guide page in a <LevelSection>/<LevelQA>
// element carrying the experience level it targets. The React components then expand or collapse them live,
// depending on the level the visitor picked. Levels come from src/data/pages.json and section-overrides.json.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {QA_HEADING, SKIP_PAGES, lookupOverride, plain, questionLevel, sectionLevel} from './level-classify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => JSON.parse(fs.readFileSync(path.join(here, '..', rel), 'utf8'));
const pages = read('src/data/pages.json');
const overrides = read('src/data/section-overrides.json');
const sectionNotes = read('src/data/level-section-notes.json');
const levelByPath = new Map(pages.map((p) => [p.path, p.level]));

/** docs/java/core-java/hashmap-internals.md -> /java/core-java/hashmap-internals (folder/folder.md -> /folder). */
function permalinkOf(filePath) {
  const norm = String(filePath ?? '').split(path.sep).join('/').replace(/\\/g, '/');
  const i = norm.lastIndexOf('/docs/');
  if (i < 0) return null;
  const parts = norm.slice(i + 6).replace(/\.mdx?$/, '').split('/');
  if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 2]) parts.pop();
  return '/' + parts.join('/');
}

const textOf = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(''));

function jsx(name, attrs, children) {
  return {
    type: 'mdxJsxFlowElement',
    name,
    attributes: Object.entries(attrs).map(([k, v]) => ({type: 'mdxJsxAttribute', name: k, value: v})),
    children,
  };
}

const isElement = (n, tag) => n.type === 'element' && (tag ? n.tagName === tag : true);

/** Interview questions look like `<p><strong>3. Question?</strong></p>` followed by the answer paragraphs. */
function questionStart(node) {
  if (!isElement(node, 'p')) return null;
  const first = (node.children ?? []).find((c) => !(c.type === 'text' && !c.value.trim()));
  if (!first || !isElement(first, 'strong')) return null;
  const t = plain(textOf(first));
  return /^\d+\.\s/.test(t) ? t : null;
}

function wrapQuestions(nodes, pageLevel) {
  const starts = nodes.map(questionStart);
  const total = starts.filter(Boolean).length;
  if (total === 0) return nodes;
  const out = [];
  let k = 0;
  let group = null;
  const flush = () => {
    if (!group) return;
    out.push(jsx('LevelQA', {at: questionLevel(pageLevel, k, total), question: group.question}, group.nodes));
    k += 1;
    group = null;
  };
  nodes.forEach((node, idx) => {
    if (starts[idx]) {
      flush();
      group = {question: starts[idx], nodes: [node]};
    } else if (group) {
      group.nodes.push(node);
    } else {
      out.push(node);
    }
  });
  flush();
  return out;
}

export default function rehypeLevelSections() {
  return (tree, file) => {
    const permalink = permalinkOf(file.path ?? file.history?.[0]);
    const pageLevel = permalink && levelByPath.get(permalink);
    if (!pageLevel || SKIP_PAGES.has(permalink)) return;
    const pageOverrides = overrides[permalink] ?? {};

    const out = [];
    let current = null;

    const flush = () => {
      if (!current) return;
      const {heading, nodes} = current;
      current = null;
      if (QA_HEADING.test(heading)) {
        const [h2, ...rest] = nodes;
        out.push(h2, ...wrapQuestions(rest, pageLevel));
        return;
      }
      const level = sectionLevel(pageLevel, heading, pageOverrides);
      if (level === null) {
        out.push(...nodes);
      } else {
        const attrs = {at: level, title: heading};
        const note = lookupOverride(sectionNotes[permalink] ?? {}, heading);
        if (note) attrs.plain = note;
        out.push(jsx('LevelSection', attrs, nodes));
      }
    };

    // The introduction (everything between the page title and the first H2) can be swapped per level.
    let introState = 'before-h1';
    let introNodes = [];
    const flushIntro = () => {
      if (introState !== 'in-intro') return;
      introState = 'done';
      if (introNodes.length) out.push(jsx('LevelIntroBody', {path: permalink}, introNodes));
      introNodes = [];
    };

    for (const node of tree.children) {
      // Docusaurus has already wrapped the page title in a <header> JSX node by the time this runs.
      const isTitle = isElement(node, 'h1') || (node.type === 'mdxJsxFlowElement' && node.name === 'header');
      if (introState === 'before-h1' && isTitle) {
        out.push(node);
        out.push(jsx('LevelIntro', {path: permalink}, []));
        introState = 'in-intro';
        continue;
      }
      if (introState === 'in-intro') {
        if (isElement(node, 'h2') || node.type === 'mdxjsEsm') {
          flushIntro();
        } else {
          introNodes.push(node);
          continue;
        }
      }
      if (isElement(node, 'h2')) {
        flush();
        current = {heading: plain(textOf(node)), nodes: [node]};
      } else if (node.type === 'mdxjsEsm') {
        flush();
        out.push(node);
      } else if (current) {
        current.nodes.push(node);
      } else {
        out.push(node);
      }
    }
    flushIntro();
    flush();
    tree.children = out;
  };
}
