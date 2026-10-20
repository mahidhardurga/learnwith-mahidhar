export interface SidebarNode {
  type: string;
  href?: string;
  label?: string;
  items?: SidebarNode[];
}

/** Every page in a node, in reading order (depth-first). */
export function flatten(items: SidebarNode[]): SidebarNode[] {
  return items.flatMap((i) => {
    if (i.type === 'link') return [i];
    // A category can itself link to a doc (e.g. the Microservices overview); it comes first.
    const own = i.href && !i.href.startsWith('/category/') ? [{type: 'link', href: i.href, label: i.label}] : [];
    return [...own, ...(i.items ? flatten(i.items) : [])];
  });
}

/** The pages directly inside a category (a topic that has sub-topics counts once, as its own page). */
function childDocs(cat: SidebarNode): SidebarNode[] {
  const own = cat.href && !cat.href.startsWith('/category/') ? [{type: 'link', href: cat.href, label: cat.label}] : [];
  const kids = (cat.items ?? []).flatMap((i): SidebarNode[] =>
    i.type === 'link' ? [i] : i.href && !i.href.startsWith('/category/') ? [{type: 'link', href: i.href, label: i.label}] : [],
  );
  return [...own, ...kids];
}

/** The deepest category that holds this page, with its pages in reading order. */
export function findSection(items: SidebarNode[], href: string): {category?: string; docs: SidebarNode[]} | null {
  for (const i of items) {
    if (i.type !== 'category') continue;
    const deeper = findSection(i.items ?? [], href);
    if (deeper) return deeper;
    const docs = childDocs(i);
    if (docs.some((d) => d.href === href)) return {category: i.label, docs};
  }
  return null;
}
