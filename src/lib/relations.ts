import { g } from "./g";
import { getPath, hasPath, isSamePath, Path } from "./path";
import { qkString } from "./qk";

export function addRelation(parent: string, child: string, path: Path) {
  if (!hasPath(g.event.child[parent]?.[child] || [], path)) {
    if (!g.event.child[parent]) {
      g.event.child[parent] = { [child]: [path] };
    } else if (!g.event.child[parent][child]) {
      g.event.child[parent][child] = [path];
    } else g.event.child[parent][child].push(path);
  }
}

export function applyRelations() {
  for (let parent in g.event.child) {
    for (let child in g.childs[parent]) {
      const prevPaths = g.childs[parent]?.[child];
      if (!prevPaths) continue;
      for (let prevPath of prevPaths) {
        if (!isSameChildInPath(parent, prevPath)) {
          removeRelation(parent, child, prevPath);
        }
      }
    }
    for (let child in g.event.child[parent]) {
      for (let path of g.event.child[parent][child]) {
        applyRelation(parent, child, path);
      }
    }
  }
}

export function applyRelation(parent: string, child: string, path: Path) {
  if (hasPath(g.childs[parent]?.[child] || [], path)) return;
  if (!g.parents[child]) g.parents[child] = {};
  if (!g.parents[child][parent]) g.parents[child][parent] = [path];
  else g.parents[child][parent].push(path);
  if (!g.childs[parent]) g.childs[parent] = {};
  if (!g.childs[parent][child]) g.childs[parent][child] = [path];
  else g.childs[parent][child].push(path);
}

export function removeRelation(parent: string, child: string, path: Path) {
  if (!g.childs[parent]?.[child]) return;
  if (g.childs[parent][child].length === 1) {
    if (Object.keys(g.childs[parent]).length === 1) delete g.childs[parent];
    else delete g.childs[parent][child];
    if (Object.keys(g.parents[child]).length === 1) delete g.parents[child];
    else delete g.parents[child][parent];
  } else {
    g.parents[child][parent] = g.parents[child][parent].filter(
      (p: any) => !isSamePath(p, path)
    );
    g.childs[parent][child] = g.childs[parent][child].filter(
      (p: any) => !isSamePath(p, path)
    );
  }
}

function isSameChildInPath(parent: string, path: Path) {
  const diff = g.event.diff[parent];
  const itemParent = getPath(diff, path.slice(0, -1));
  if (!itemParent) return true;
  if (!itemParent.hasOwnProperty(path[path.length - 1])) return true;

  const parentQK = g.stQK[parent];
  const item = itemParent[path[path.length - 1]];
  const prevItem = getPath(g.cache[parent], path);
  const parentDeps = g.orm[parentQK[0]];
  const dep = Array.isArray(itemParent)
    ? getPath(parentDeps, path.slice(0, -1))
    : getPath(parentDeps, path);

  if (typeof dep === "function") {
    const childQK = item && dep(item);
    const prevChildQK = prevItem && dep(prevItem);
    return qkString(childQK) === qkString(prevChildQK);
  }
  const id = item && g.config[dep]?.id(item);
  const prevId = prevItem && g.config[dep]?.id(prevItem);
  return id === prevId;
}
