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

/** The top-level section (Java, Microservices, ...) that holds this page, as an ordered list of its pages. */
export function findSection(items: SidebarNode[], href: string): {category?: string; docs: SidebarNode[]} | null {
  for (const i of items) {
    const docs = flatten([i]);
    if (docs.some((d) => d.href === href)) return {category: i.type === 'category' ? i.label : undefined, docs};
  }
  return null;
}
