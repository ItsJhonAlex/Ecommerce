import { describe, expect, test } from "vitest";
import type { Category } from "./types";
import { buildTree, descendantIds } from "./tree";

const cats: Category[] = [
  { id: "a", slug: "a", name: "Alpha", parentId: null },
  { id: "b", slug: "b", name: "Beta", parentId: "a" },
  { id: "c", slug: "c", name: "Gamma", parentId: "b" },
  { id: "d", slug: "d", name: "Delta", parentId: null },
];

describe("buildTree", () => {
  test("arma la jerarquía y ordena por nombre", () => {
    const tree = buildTree(cats);
    expect(tree.map((n) => n.id)).toEqual(["a", "d"]);
    expect(tree[0]!.children.map((n) => n.id)).toEqual(["b"]);
    expect(tree[0]!.children[0]!.children.map((n) => n.id)).toEqual(["c"]);
  });

  test("un parentId inexistente se trata como raíz", () => {
    const tree = buildTree([{ id: "x", slug: "x", name: "X", parentId: "ZZZ" }]);
    expect(tree.map((n) => n.id)).toEqual(["x"]);
  });
});

describe("descendantIds", () => {
  test("devuelve el subárbol incluyendo el propio id", () => {
    expect(descendantIds(cats, "a")).toEqual(new Set(["a", "b", "c"]));
    expect(descendantIds(cats, "b")).toEqual(new Set(["b", "c"]));
    expect(descendantIds(cats, "d")).toEqual(new Set(["d"]));
  });
});
