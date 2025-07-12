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
  g.evtChanges[orderSym].push(st);
  g.evtChanges[st] = {
    qk,
    diff,
    updated: false,
  };
  // @ts-expect-error
  const deps = ormm[qk[0]];
  if (deps) applyDeps(qk, deps, diff);
}

function applyDeps(qk: any, deps: any, diff: any, path: any[] = []) {
  for (let depKeyt in deps) {
    const depKey = depKeyt as keyof typeof deps;
    const dep = deps[depKey];
    const childDiff = diff?.[depKey];
    if (!childDiff) continue;

    if (typeof dep === "string") {
      // @ts-expect-error
      const childId = config[dep].id(childDiff);
      const childQK = [dep, childId];
      addChildDiff(qk, childQK, childDiff, [...path, depKey]);
    } else if (typeof dep === "function") {
      for (let i = 0; i < childDiff.length; i++) {
        addChildDiff(qk, dep(childDiff[i]), childDiff[i], [...path, depKey, i]);
      }
    } else {
      for (let key in dep) {
        applyDeps(qk, dep[key], diff[key], [...path, depKey]);
      }
    }
  }
}

export function rmOutdatedRelations(rootQK: string, list?: any[]) {
  for (let parent in g.currentChilds) {
    const currentList = parent === rootQK && list;
    for (let child in g.childs[parent]) {
      const prevPaths = g.childs[parent]?.[child];
      if (!prevPaths) continue;

      const paths = g.currentChilds[parent][child];
      for (let prevPath of prevPaths) {
        const shouldRemove = paths
          ? // eslint-disable-next-line no-loop-func
            paths.some((path: any) =>
              shouldRemoveRelationByPaths(
                path,
                prevPath,
                g.evtChanges[parent]?.diff || currentList
              )
            )
          : shouldRemoveRelationByDiff(
              prevPath,
              g.evtChanges[parent]?.diff || currentList
            );
        if (shouldRemove) {
          removeRelation(
            g.currentChilds[parentQKSym][parent],
            parent,
            child,
            prevPath
          );
        }
      }
    }
  }
}

function addChildDiff(qk: any, childQK: any, childDiff: any, path: any[]) {
  const qkStr = qkString(qk);
  const childQKSt = qkString(childQK);
  addRelation(qk, qkStr, childQKSt, path);

  if (!g.evtChanges[childQKSt]) setQK(childQK, childDiff);
  else {
    g.evtChanges[childQKSt].diff = {
      ...g.evtChanges[childQKSt].diff,
      ...childDiff,
    };
  }
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
  if (g.childs[parent][child].length === 1) {
    delete g.parents[child][parentQK[0]][parentQK[1]];
    delete g.childs[parent][child];
  } else {
    g.parents[child][parentQK[0]][parentQK[1]] = g.parents[child][parentQK[0]][
      parentQK[1]
    ].filter((p: any) => isSamePath(p, path));
    g.childs[parent] = g.childs[parent].filter((p: any) => isSamePath(p, path));
  }
}

function hasPath(paths: Path[], path: Path) {
  return paths.some((p) => isSamePath(p, path));
}

function shouldRemoveRelationByPaths(x: Path, y: Path, diff: any) {
  return (
    x.length === y.length &&
    x.some((k, i) => {
      const isLast = i === x.length - 1;
      if (!isLast && diff) diff = diff[k];
      return k !== y[i] || (isLast && (!diff || !diff.hasOwnProperty(k)));
    })
  );
}

function shouldRemoveRelationByDiff(prevPath: Path, diff: any) {
  for (let i = 0; i < prevPath.length; i++) {
    if (prevPath.length === 1 || i === prevPath.length - 2) {
      if (Array.isArray(i ? diff[prevPath.length] : diff)) {
        return false;
      } else return diff?.hasOwnProperty(prevPath[i]);
    }
    if (!diff) return false;
    diff = diff[prevPath[i]];
  }
  return false;
}

function isSamePath(x: Path, y: Path) {
  return x.length === y.length && x.every((x, i) => x === y[i]);
}

type Path = (string | number)[];
