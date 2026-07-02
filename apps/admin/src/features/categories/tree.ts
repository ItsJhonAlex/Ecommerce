import type { Category } from "./types";

export type CategoryNode = Category & { children: CategoryNode[] };

/** Arma el árbol de categorías por parentId. Raíces = parentId null o padre inexistente. Ordena por nombre. */
export function buildTree(categories: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const c of categories) byId.set(c.id, { ...c, children: [] });

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}

/** Ids del subárbol de `id` (incluyéndolo). Para excluir del selector de padre y evitar ciclos. */
export function descendantIds(categories: Category[], id: string): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const c of categories) {
    if (c.parentId) {
      const arr = childrenOf.get(c.parentId) ?? [];
      arr.push(c.id);
      childrenOf.set(c.parentId, arr);
    }
  }
  const result = new Set<string>([id]);
  const stack = [id];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    for (const childId of childrenOf.get(cur) ?? []) {
      if (!result.has(childId)) {
        result.add(childId);
        stack.push(childId);
      }
    }
  }
  return result;
}
