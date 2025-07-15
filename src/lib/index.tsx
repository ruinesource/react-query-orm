import g, { parentQKSym, orderSym } from "./g";
import { config, ormm } from "../orm";

export function getEvtChanges(event: any) {
  const { queryKey, state } = event.query;

  g.evtChanges = { [orderSym]: [] } as any;
  // @ts-expect-error
  const item = config[queryKey[0]];
  if (item.many) {
    const list = item.list(state.data);
    setListChanges(queryKey, list);
  } else setQK(queryKey, item.x(state.data));

  return g.evtChanges;
}

function setListChanges(qk: any, list: any) {
  if (!g.cache[qk[0]]) g.cache[qk[0]] = list;
  const parentSt = qkString(qk);

  for (let i = 0; i < list.length; i++) {
    const x = list[i];
    // @ts-expect-error
    const itemQK = ormm[qk[0]](x);
    const st = qkString(itemQK);
    addRelation(qk, parentSt, st, [i]);
    setQK(itemQK, x);
  }
}

function setQK(qk: any[], diff: any) {
  const st = qkString(qk);

  if (!g.evtChanges[st]) {
    g.evtChanges[orderSym].push(st);
    g.evtChanges[st] = {
      qk,
      diff,
      updated: false,
    };
  } else
    g.evtChanges[st].diff = {
      ...g.evtChanges[st].diff,
      ...diff,
    };
  // @ts-expect-error
  const deps = ormm[qk[0]];
  if (deps) applyDeps(qk, deps, diff);
}

function applyDeps(qk: any, deps: any, diff: any, path: any[] = []) {
  for (let key in deps) {
    if (["string", "function"].includes(typeof deps[key])) {
      applyDep(qk, key, deps[key], diff, [...path, key]);
    } else {
      if (diff) applyDeps(qk, deps[key], diff[key], [...path, key]);
    }
  }
}

function applyDep(
  qk: any,
  depKey: any,
  dep: any,
  parentDiff: any,
  path: any[]
) {
  if (!parentDiff?.hasOwnProperty(depKey)) return;

  const diff = parentDiff?.[depKey];
  if (!diff) return;

  if (typeof dep === "string") {
    // @ts-expect-error
    const childId = config[dep].id(diff);
    const childQK = [dep, childId];
    addChildDiff(qk, childQK, diff, path);
  } else if (typeof dep === "function") {
    addChildArrayDiffs(qk, diff, dep, path);
  }
}

function addChildArrayDiffs(qk: any, childDiff: any, dep: any, path: any[]) {
  for (let i = 0; i < childDiff.length; i++) {
    const itemQK = dep(childDiff[i]);
    addChildDiff(qk, itemQK, childDiff[i], [...path, i]);
  }
  const prev = getPath(g.cache[qk[0]]?.[qk[1]], path);
  if ((prev?.length || 0) > childDiff.length) {
    for (let i = childDiff.length; i < prev.length; i++) {
      const childQK = dep(prev[i]);
      removeRelation(qk, qkString(qk), qkString(childQK), [...path, i]);
    }
  }
}

function addChildDiff(qk: any, childQK: any, childDiff: any, path: any[]) {
  const qkStr = qkString(qk);
  const childQKSt = qkString(childQK);
  addRelation(qk, qkStr, childQKSt, path);
  setQK(childQK, childDiff);
}

export function qkString(x: (string | number | symbol)[]) {
  return x.join("");
}

function addRelation(parentQK: any, parent: string, child: string, path: Path) {
  if (!hasPath(g.currentChilds[parent]?.[child] || [], path)) {
    if (!g.currentChilds[parent]) {
      g.currentChilds[parent] = { [child]: [path] };
    } else if (!g.currentChilds[parent][child]) {
      g.currentChilds[parent][child] = [path];
    } else g.currentChilds[parent][child].push(path);
    g.currentChilds[parentQKSym][parent] = parentQK;
  }
}

export function applyRelations() {
  for (let parent in g.currentChilds) {
    for (let child in g.childs[parent]) {
      const prevPaths = g.childs[parent]?.[child];
      if (!prevPaths) continue;

      for (let prevPath of prevPaths) {
        if (!isSameChildInPath(parent, prevPath)) {
          removeRelation(
            g.currentChilds[parentQKSym][parent],
            parent,
            child,
            prevPath
          );
        }
      }
    }
    for (let child in g.currentChilds[parent]) {
      for (let path of g.currentChilds[parent][child]) {
        applyRelation(
          g.currentChilds[parentQKSym][parent],
          parent,
          child,
          path
        );
      }
    }
  }
}

function applyRelation(
  parentQK: any,
  parent: string,
  child: string,
  path: Path
) {
  if (hasPath(g.childs[parent]?.[child] || [], path)) return;
  if (!g.parents[child]) g.parents[child] = {};
  const pOrm = parentQK[0];
  const pId = parentQK[1];
  if (pId) {
    if (!g.parents[child][pOrm]) g.parents[child][pOrm] = {};
    if (!g.parents[child][pOrm][pId]) g.parents[child][pOrm][pId] = [path];
    else g.parents[child][pOrm][pId].push(path);
  } else {
    if (!g.parents[child][pOrm]) g.parents[child][pOrm] = [path];
    else g.parents[child][pOrm].push(path);
  }

  if (!g.childs[parent]) g.childs[parent] = {};
  if (!g.childs[parent][child]) g.childs[parent][child] = [path];
  else g.childs[parent][child].push(path);
}

function removeRelation(
  parentQK: any,
  parent: string,
  child: string,
  path: Path
) {
  if (!g.childs[parent]?.[child]) return;
  if (g.childs[parent][child].length === 1) {
    delete g.parents[child][parentQK[0]][parentQK[1]];
    delete g.childs[parent][child];
    if (!Object.keys(g.parents[child][parentQK[0]]).length) {
      delete g.parents[child][parentQK[0]];
      if (!Object.keys(g.parents[child]).length) {
        delete g.parents[child];
      }
    }
    if (!Object.keys(g.childs[parent]).length) {
      delete g.childs[parent];
    }
  } else {
    g.parents[child][parentQK[0]][parentQK[1]] = g.parents[child][parentQK[0]][
      parentQK[1]
    ].filter((p: any) => !isSamePath(p, path));
    g.childs[parent][child] = g.childs[parent][child].filter(
      (p: any) => !isSamePath(p, path)
    );
  }
}

function isSameChildInPath(parent: string, path: Path) {
  const diff = g.evtChanges[parent]?.diff;
  const itemParent = getPath(diff, path.slice(0, -1));
  if (!itemParent) return true;
  const parentQK = g.currentChilds[parentQKSym][parent];
  const item = itemParent[path[path.length - 1]];
  const prevItem = getPath(g.cache[parentQK[0]]?.[parentQK[1]], path);
  // @ts-expect-error
  const parentDeps = ormm[parentQK[0]];
  const dep = Array.isArray(itemParent)
    ? getPath(parentDeps, path.slice(0, -1))
    : getPath(parentDeps, path);

  if (typeof dep === "function") {
    const childQK = item && dep(item);
    const prevChildQK = prevItem && dep(prevItem);
    return (
      childQK?.[0] === prevChildQK?.[0] && childQK?.[1] === prevChildQK?.[1]
    );
  }
  if (!itemParent.hasOwnProperty(path[path.length - 1])) return true;
  // @ts-expect-error
  const id = config[dep]?.id(item);
  // @ts-expect-error
  const prevId = config[dep]?.id(prevItem);
  return id === prevId;
}

function getPath(inst: any, path: Path) {
  let current = inst;
  for (let i = 0; i < path.length; i++) {
    if (!current) return;
    current = current[path[i]];
  }
  return current;
}

function hasPath(paths: Path[], path: Path) {
  return paths.some((p) => isSamePath(p, path));
}

function isSamePath(x: Path, y: Path) {
  return x.length === y.length && x.every((x, i) => x === y[i]);
}

type Path = (string | number)[];
