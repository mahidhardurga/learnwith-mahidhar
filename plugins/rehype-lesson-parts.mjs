// Rehype plugin: every topic page shows just three things: the title, a short definition and example code.
//   - The definition comes from src/data/lessons.json (`def`).
//   - The example is `example` from lessons.json when given, else a code block from the page's own markdown
//     (the section named by `exampleFrom`, or the best-looking block). Everything else written in the markdown file stays there but is not shown.
// Pages without a `def` in lessons.json (cheat sheets, question banks) are left exactly as written.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const lessons = JSON.parse(fs.readFileSync(path.join(here, '..', 'src/data/lessons.json'), 'utf8'));

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
const isElement = (n, tag) => n.type === 'element' && (tag ? n.tagName === tag : true);

function jsx(name, attrs, children) {
  return {
    type: 'mdxJsxFlowElement',
    name,
    attributes: Object.entries(attrs).map(([k, v]) => ({type: 'mdxJsxAttribute', name: k, value: v})),
    children,
  };
}

/** Every fenced code block with the section heading it sits under, in page order. */
function findCodeBlocks(nodes, section = {title: ''}, out = []) {
  for (const node of nodes) {
    if (isElement(node, 'h2') || isElement(node, 'h3')) {
      section.title = textOf(node).replace(/[`*]/g, '').replace(/​/g, '').trim();
    } else if (isElement(node, 'pre')) {
      const code = (node.children ?? []).find((c) => isElement(c, 'code'));
      const lang = ((code?.properties?.className ?? []).find((c) => String(c).startsWith('language-')) ?? '').replace('language-', '');
      if (code && lang !== 'mermaid' && lang !== 'text' && lang !== '') {
        out.push({node, lang, section: section.title, lines: textOf(code).split('\n').length});
      }
    } else if (node.children) {
      findCodeBlocks(node.children, section, out);
    }
  }
  return out;
}

/** Prefer a block under an "Example..." heading, then the biggest Java block of a sensible size. */
function pickExample(blocks) {
  const marked = blocks.find((b) => /^example/i.test(b.section));
  if (marked) return marked;
  const sized = blocks.filter((b) => b.lines >= 6 && b.lines <= 70);
  const pool = sized.length ? sized : blocks;
  const java = pool.filter((b) => b.lang === 'java');
  const best = (java.length ? java : pool).reduce((a, b) => (b.lines > a.lines ? b : a), (java.length ? java : pool)[0]);
  return best;
}

function codeNode(lang, code) {
  return {
    type: 'element',
    tagName: 'pre',
    properties: {},
    children: [{type: 'element', tagName: 'code', properties: {className: [`language-${lang}`]}, children: [{type: 'text', value: code}]}],
  };
}

export default function rehypeLessonParts() {
  return (tree, file) => {
    const permalink = permalinkOf(file.path ?? file.history?.[0]);
    const lesson = permalink ? lessons[permalink] : undefined;
    if (!lesson?.def) return;

    const esm = tree.children.filter((n) => n.type === 'mdxjsEsm');
    // Docusaurus has already wrapped the page title in a <header> JSX node by the time this runs.
    const title = tree.children.find((n) => isElement(n, 'h1') || (n.type === 'mdxJsxFlowElement' && n.name === 'header'));

    let exampleNodes = [];
    if (lesson.example) {
      exampleNodes = [
        {type: 'element', tagName: 'p', properties: {className: ['lw-caption']}, children: [{type: 'text', value: lesson.example.title}]},
        codeNode(lesson.example.lang, lesson.example.code),
      ];
    } else {
      const blocks = findCodeBlocks(tree.children);
      // `exampleFrom` in lessons.json names the section to take the example from.
      const named = lesson.exampleFrom ? blocks.filter((b) => b.section === lesson.exampleFrom) : [];
      const picked = named.length ? named.reduce((a, b) => (b.lines > a.lines ? b : a)) : pickExample(blocks);
      if (picked) {
        const caption = picked.section.replace(/^example:\s*/i, '');
        exampleNodes = [
          ...(caption ? [{type: 'element', tagName: 'p', properties: {className: ['lw-caption']}, children: [{type: 'text', value: caption}]}] : []),
          picked.node,
        ];
      }
    }

    const slot = (name, id, body) => jsx('LessonSlot', {title: name, id}, body);
    tree.children = [
      ...esm,
      ...(title ? [title] : []),
      slot('Definition', 'definition', [jsx('LessonDefinition', {path: permalink}, [])]),
      ...(exampleNodes.length ? [slot('Example code', 'example-code', exampleNodes)] : []),
    ];
  };
}
