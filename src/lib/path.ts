import { g } from "./g";
import { qkString } from "./qk";

export type Path = (string | number)[];

export function getPath(inst: any, path: Path) {
  let current = inst;
  for (let i = 0; i < path.length; i++) {
    if (!current) return;
    current = current[path[i]];
  }
  return current;
}

export function putToPath(parent: any, child: any, path: any): any {
  const key = path[0];
  const parentChildItem =
    path.length === 1 ? child : putToPath(parent[key], child, path.slice(1));

  return Array.isArray(parent)
    ? parent.map((x, i) => (i === +key ? parentChildItem : x))
    : {
        ...parent,
        [key]: parentChildItem,
      };
}

export function clonePath(parent: any, path: any) {
  const inst = path.reduce((current: any, key: any) => current[key], parent);
  return Array.isArray(inst) ? [...inst] : { ...inst };
}

export function hasPath(paths: Path[], path: Path) {
  return paths.some((p) => isSamePath(p, path));
}

export function isSamePath(x: Path, y: Path) {
  return x.length === y.length && x.every((x, i) => x === y[i]);
}

export function isSameChildInPath(parent: string, path: Path) {
  const diff = g.evtChanges[parent]?.diff;
  const itemParent = getPath(diff, path.slice(0, -1));
  if (!itemParent) return true;
  if (!itemParent.hasOwnProperty(path[path.length - 1])) return true;

  const parentQK = g.qkSt[parent];
  const item = itemParent[path[path.length - 1]];
  const prevItem = getPath(g.cache[parentQK[0]]?.[parentQK[1]], path);
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
