// Rehype plugin: arranges every guide page into the ten fixed parts of a lesson, in order.
//   1 Definition  2 Why it exists  3 How it works  4 Example code  5 System design considerations
//   6 When to use it, and when not  7 Common mistakes  8 Interview questions  9 Check yourself  10 Key takeaways
// A part is skipped when a page has nothing for it, and the numbers stay fixed.
// Parts 1, 2, 5 and 6 can come from src/data/lessons.json; the other parts come from the page's own sections,
// mapped by src/data/section-slots.json (unmapped sections belong to part 3).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => JSON.parse(fs.readFileSync(path.join(here, '..', rel), 'utf8'));
const pages = read('src/data/pages.json');
const lessons = read('src/data/lessons.json');
const sectionSlots = read('src/data/section-slots.json');
const knownPages = new Set(pages.map((p) => p.path));

/** Pages that keep their own layout (the question banks). */
const SKIP_PAGES = new Set(['/toolkit/questions-fresher', '/toolkit/questions-mid-level', '/toolkit/questions-senior']);
const QA_HEADING = /^common interview questions/i;

const SLOT_TITLES = {
  1: 'Definition',
  2: 'Why it exists',
  3: 'How it works',
  4: 'Example code',
  5: 'System design considerations',
  6: 'When to use it, and when not',
  7: 'Common mistakes',
  8: 'Interview questions',
  9: 'Check yourself',
  10: 'Key takeaways',
};

/** Heading text as plain text: no backticks or bold markers. */
const plain = (text) => text.replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();

/** Exact plain-text key, else a `prefix*` wildcard key. */
function lookup(map, heading) {
  if (map[heading] !== undefined) return map[heading];
  for (const [key, value] of Object.entries(map)) {
    if (key.endsWith('*') && heading.startsWith(key.slice(0, -1))) return value;
  }
  return undefined;
}

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

/** Same id Docusaurus derives from the heading text (github-slugger style). */
function slugify(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/ /g, '-');
}

function slotOf(heading, permalink) {
  if (QA_HEADING.test(heading)) return 8;
  if (/^(pitfalls?|common mistakes)/i.test(heading)) return 7;
  if (/^(try it|check yourself)/i.test(heading)) return 9;
  if (/^key takeaways?/i.test(heading)) return 10;
  return lookup(sectionSlots[permalink] ?? {}, heading) ?? 3;
}

/** Headings whose own text is replaced by the numbered part title (the part keeps their id for the page outline). */
const DROP_HEADING = /^(pitfalls?|common mistakes|check yourself|key takeaways?)/i;

/** Interview questions look like `<p><strong>3. Question?</strong></p>` followed by the answer paragraphs. */
function questionStart(node) {
  if (!isElement(node, 'p')) return null;
  const first = (node.children ?? []).find((c) => !(c.type === 'text' && !c.value.trim()));
  if (!first || !isElement(first, 'strong')) return null;
  const t = plain(textOf(first));
  return /^\d+\.\s/.test(t) ? t : null;
}

/** The answer often follows the bold question in the same paragraph: return it as its own paragraph. */
function answerRest(p) {
  const kids = p.children ?? [];
  const at = kids.findIndex((c) => isElement(c, 'strong'));
  const rest = kids.slice(at + 1);
  while (rest.length && rest[0].type === 'text' && !rest[0].value.trim()) rest.shift();
  if (rest.length && rest[0].type === 'text') rest[0] = {...rest[0], value: rest[0].value.replace(/^\s+/, '')};
  return rest.length ? [{...p, children: rest}] : [];
}

function wrapQuestions(nodes) {
  const starts = nodes.map(questionStart);
  if (!starts.some(Boolean)) return nodes;
  const out = [];
  let group = null;
  const flush = () => {
    if (group) out.push(jsx('InterviewQA', {question: group.question}, group.nodes));
    group = null;
  };
  nodes.forEach((node, idx) => {
    if (starts[idx]) {
      flush();
      group = {question: starts[idx], nodes: answerRest(node)};
    } else if (group) {
      group.nodes.push(node);
    } else {
      out.push(node);
    }
  });
  flush();
  return out;
}

export default function rehypeLessonParts() {
  return (tree, file) => {
    const permalink = permalinkOf(file.path ?? file.history?.[0]);
    if (!permalink || !knownPages.has(permalink) || SKIP_PAGES.has(permalink)) return;
    const lesson = lessons[permalink] ?? {};

    const head = [];
    const esm = [];
    const outcomes = [];
    const secs = []; // {slot, id, nodes, dropped, lab}
    let current = null;

    const flush = () => {
      if (!current) return;
      const {heading, nodes} = current;
      current = null;
      const slot = slotOf(heading, permalink);
      const [h2, ...rest] = nodes;
      const id = h2.properties?.id ?? slugify(heading);
      if (QA_HEADING.test(heading)) {
        secs.push({slot, id, dropped: true, nodes: wrapQuestions(rest)});
      } else if (DROP_HEADING.test(heading)) {
        secs.push({slot, id, dropped: true, nodes: rest});
      } else {
        secs.push({slot, id, lab: /^try it/i.test(heading), nodes: [{...h2, tagName: 'h3'}, ...rest]});
      }
    };

    let state = 'before-h1';
    for (const node of tree.children) {
      // Docusaurus has already wrapped the page title in a <header> JSX node by the time this runs.
      const isTitle = isElement(node, 'h1') || (node.type === 'mdxJsxFlowElement' && node.name === 'header');
      if (state === 'before-h1' && isTitle) {
        head.push(node);
        state = 'in-intro';
        continue;
      }
      if (state === 'in-intro') {
        if (isElement(node, 'h2') || node.type === 'mdxjsEsm') {
          state = 'done';
        } else if (node.type === 'mdxJsxFlowElement' && node.name === 'Outcomes') {
          outcomes.push(node);
          continue;
        } else {
          head.push(node);
          continue;
        }
      }
      if (node.type === 'mdxjsEsm') {
        flush();
        esm.push(node);
      } else if (isElement(node, 'h2')) {
        flush();
        current = {heading: plain(textOf(node)), nodes: [node]};
      } else if (current) {
        current.nodes.push(node);
      } else {
        head.push(node);
      }
    }
    flush();

    // Parts that come from data rather than from the markdown.
    const injected = {1: [], 2: [], 5: [], 6: [], 10: []};
    if (lesson.def) injected[1].push(jsx('LessonDefinition', {path: permalink}, []));
    if (lesson.why) injected[2].push(jsx('LessonWhy', {path: permalink}, []));
    if (lesson.design?.length) injected[5].push(jsx('LessonDesign', {path: permalink}, []));
    if (lesson.use?.length || lesson.avoid?.length) injected[6].push(jsx('LessonWhen', {path: permalink}, []));
    injected[10].push(jsx('NextTopic', {path: permalink}, []));

    const groups = [];
    for (let slot = 1; slot <= 10; slot++) {
      const mine = secs.filter((s) => s.slot === slot);
      const pre = injected[slot] ?? [];
      if (mine.length === 0 && pre.length === 0) continue;
      let title = SLOT_TITLES[slot];
      if (slot === 9 && mine.some((m) => m.lab)) title = 'Try it and check yourself';
      if (slot === 10 && mine.length === 0) title = 'Next topic';
      const id = mine.find((m) => m.dropped && m.id)?.id ?? `lesson-${title.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}`;
      const body = [...(slot === 10 ? [] : pre), ...mine.flatMap((m) => m.nodes), ...(slot === 10 ? pre : [])];
      groups.push(jsx('LessonSlot', {n: String(slot), title, id}, body));
    }

    tree.children = [...esm, ...head, ...outcomes, ...groups];
  };
}
