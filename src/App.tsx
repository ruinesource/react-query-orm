import { useQuery } from "@tanstack/react-query";
import React, { useEffect } from "react";
import { config, ormm, getHost, getVm, getClusters, getCluster } from "./orm";
import { queryClient } from ".";
const listSym = Symbol("list");
const orderSym = Symbol("order");
const parentQKSym = Symbol("parentQK");

const cache = {} as any;
const parents = {} as any; // { host1 -> { cluster1: 'host' } }
const childs = {} as any;
console.log(cache, childs, parents);
let evtChanges = { [listSym]: {} } as any;
let currentChilds = { [parentQKSym]: {} } as any;

function App() {
  const c = useQuery({
    queryKey: ["cluster", "1"],
    queryFn: async () => {
      await delay(200);
      return getCluster("1");
    },
  });
  const r = useQuery({
    queryKey: ["host", "1"],
    queryFn: async () => {
      await delay(100);
      return getHost("1");
    },
  });
  const e = useQuery({
    queryKey: ["vm", "1"],
    queryFn: async () => {
      await delay(500);
      const vm = await getVm("1");
      return vm;
    },
  });
  const s = useQuery({
    queryKey: ["clusters"],
    queryFn: async () => {
      await delay(200);
      return getClusters();
    },
  });

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return;

      const st = qkString(event.query.queryKey);
      if (evtChanges[st] && !evtChanges[st].updated) {
        evtChanges[st].updated = true;
        return;
      }
      if (evtChanges[listSym][st]) {
        delete evtChanges[listSym][st];
        return;
      }

      try {
        currentChilds = { [parentQKSym]: {} };
        evtChanges = getEvtChanges(event);

        // @ts-expect-error
        const configItem = config[event.query.queryKey[0]];
        let list;
        if (configItem.many) {
          list = configItem.list(event.query.state.data);
          cache[event.query.queryKey[0]] = list;
        }
        rmOutdatedRelations(st, list);

        for (let key of evtChanges[orderSym]) {
          const { qk, diff } = evtChanges[key];
          const qkStr = qkString(qk);

          if (!cache[qk[0]]) cache[qk[0]] = {};
          cache[qk[0]][qk[1]] = { ...cache[qk[0]][qk[1]] };
          const cacheItems = [cache[qk[0]][qk[1]]];

          const itemParents = parents[qkStr];
          if (itemParents) {
            for (let ormName in itemParents) {
              if (Array.isArray(cache[ormName])) continue;
              else {
                for (let id in itemParents[ormName]) {
                  const parentCacheItem = cache[ormName]?.[id];
                  if (!parentCacheItem) continue;
                  for (let path of itemParents[ormName][id]) {
                    cacheItems.push(getByPath(parentCacheItem, path));
                  }
                }
              }
            }
          }

          const finalDiff = { ...cacheItems[0], ...diff };
          for (let keyt in diff) {
            const key = keyt as keyof typeof diff;
            cacheItems.forEach((x) => (x[key] = finalDiff[key]));
          }

          if (itemParents) {
            for (let ormName in itemParents) {
              if (Array.isArray(cache[ormName])) continue;
              else {
                for (let id in itemParents[ormName]) {
                  for (let path of itemParents[ormName][id]) {
                    cache[ormName][id] = putToPath(
                      cache[ormName][id],
                      cacheItems[0],
                      path
                    );
                  }
                }
              }
            }
          }
        }
        for (let i = evtChanges[orderSym].length - 1; i >= 0; i--) {
          const key = evtChanges[orderSym][i];
          const { qk } = evtChanges[key];
          const qkStr = qkString(qk);
          const cacheItems = [cache[qk[0]][qk[1]]];
          const itemParents = parents[qkStr];

          if (itemParents) {
            for (let ormName in itemParents) {
              if (Array.isArray(cache[ormName])) {
                for (let path of itemParents[ormName]) {
                  cache[ormName] = putToPath(
                    cache[ormName],
                    cacheItems[0],
                    path
                  );
                }
              } else {
                for (let id in itemParents[ormName]) {
                  for (let path of itemParents[ormName][id]) {
                    cache[ormName][id] = putToPath(
                      cache[ormName][id],
                      cacheItems[0],
                      path
                    );
                  }
                }
              }
            }
          }

          const data = queryClient.getQueryData(qk);
          if (data && qkStr !== st) {
            // @ts-expect-error
            const rqData = config[qk[0]].put(cacheItems[0], data);
            queryClient.setQueryData(qk, rqData);
          } else evtChanges[key].updated = true;
        }
      } catch (e) {
        console.log(e);
      }
    });
    return unsubscribe;
  }, []);
  return <></>;
}

function rmOutdatedRelations(rootQK: string, list?: any[]) {
  for (let parent in currentChilds) {
    const currentList = parent === rootQK && list;
    for (let child in childs[parent]) {
      const prevPaths = childs[parent]?.[child];
      if (!prevPaths) continue;

      const paths = currentChilds[parent][child];
      for (let prevPath of prevPaths) {
        const shouldRemove = paths
          ? // eslint-disable-next-line no-loop-func
            paths.some((path: any) =>
              shouldRemoveRelationByPaths(
                path,
                prevPath,
                evtChanges[parent]?.diff || currentList
              )
            )
          : shouldRemoveRelationByDiff(
              prevPath,
              evtChanges[parent]?.diff || currentList
            );
        if (shouldRemove) {
          removeRelation(
            currentChilds[parentQKSym][parent],
            parent,
            child,
            prevPath
          );
        }
      }
    }
  }
}

function getEvtChanges(event: any) {
  const { queryKey, state } = event.query;

  let evtChanges = { [listSym]: [], [orderSym]: [] } as any;
  // @ts-expect-error
  const item = config[queryKey[0]];
  if (item.many) {
    const list = item.list(state.data);
    setListChanges(queryKey, evtChanges, list);
  } else setQK(queryKey, item.x(state.data), evtChanges);

  return evtChanges;
}

function setListChanges(qk: any, evtChanges: any, list: any) {
  if (!cache[qk[0]]) cache[qk[0]] = list;
  const parentSt = qkString(qk);

  for (let i = 0; i < list.length; i++) {
    const x = list[i];
    // @ts-expect-error
    const itemQK = ormm[qk[0]](x);
    const st = qkString(itemQK);
    addRelation(qk, parentSt, st, [i]);
    setQK(itemQK, x, evtChanges);
  }
}

function setQK(qk: any[], diff: any, evtChanges: any) {
  const st = qkString(qk);
  evtChanges[orderSym].push(st);
  evtChanges[st] = {
    qk,
    diff,
    updated: false,
  };
  // @ts-expect-error
  const deps = ormm[qk[0]];
  if (deps) applyDeps(qk, deps, diff, evtChanges);
}

function applyDeps(
  qk: any,
  deps: any,
  diff: any,
  evtChanges: any,
  path: any[] = []
) {
  for (let depKeyt in deps) {
    const depKey = depKeyt as keyof typeof deps;
    const dep = deps[depKey];
    const childDiff = diff?.[depKey];
    if (!childDiff) continue;

    if (typeof dep === "string") {
      // @ts-expect-error
      const childId = config[dep].id(childDiff);
      const childQK = [dep, childId];

      addChildDiff(qk, childQK, childDiff, evtChanges, [...path, depKey]);
    } else if (typeof dep === "function") {
      for (let i = 0; i < childDiff.length; i++) {
        addChildDiff(qk, dep(childDiff[i]), childDiff[i], evtChanges, [
          ...path,
          depKey,
          i,
        ]);
      }
    } else {
      for (let key in dep) {
        applyDeps(qk, dep[key], diff[key], evtChanges, [...path, depKey]);
      }
    }
  }
}

function addChildDiff(
  qk: any,
  childQK: any,
  childDiff: any,
  evtChanges: any,
  path: any[]
) {
  const qkStr = qkString(qk);
  const childQKSt = qkString(childQK);
  addRelation(qk, qkStr, childQKSt, path);

  if (!evtChanges[childQKSt]) setQK(childQK, childDiff, evtChanges);
  else {
    evtChanges[childQKSt].diff = {
      ...evtChanges[childQKSt].diff,
      ...childDiff,
    };
  }
}

function qkString(x: (string | number | symbol)[]) {
  return x.join("");
}

function delay(ms: number = 200) {
  return new Promise((r) => setTimeout(() => r(1), ms));
}

function getByPath(parent: any, path: any) {
  return { ...path.reduce((current: any, key: any) => current[key], parent) };
}

function putToPath(parent: any, child: any, path: any): any {
  const key = path[0];
  if (path.length === 1) {
    return Array.isArray(parent)
      ? parent.map((x, i) => (i === +path[0] ? child : x))
      : {
          ...parent,
          [key]: child,
        };
  }
  return {
    ...parent,
    [key]: putToPath(parent[key], child, path.slice(1)),
  };
}

function addRelation(parentQK: any, parent: string, child: string, path: Path) {
  if (!hasPath(currentChilds[parent]?.[child] || [], path)) {
    if (!currentChilds[parent]) {
      currentChilds[parent] = { [child]: [path] };
    } else if (!currentChilds[parent][child]) {
      currentChilds[parent][child] = [path];
    } else currentChilds[parent][child].push(path);
    currentChilds[parentQKSym][parent] = parentQK;
  }

  if (hasPath(childs[parent]?.[child] || [], path)) return;
  if (!parents[child]) parents[child] = {};
  const pOrm = parentQK[0];
  const pId = parentQK[1];
  if (pId) {
    if (!parents[child][pOrm]) parents[child][pOrm] = {};
    if (!parents[child][pOrm][pId]) parents[child][pOrm][pId] = [path];
    else parents[child][pOrm][pId].push(path);
  } else {
    if (!parents[child][pOrm]) parents[child][pOrm] = [path];
    else parents[child][pOrm].push(path);
  }

  if (!childs[parent]) childs[parent] = {};
  if (!childs[parent][child]) childs[parent][child] = [path];
  else childs[parent][child].push(path);
}

function removeRelation(
  parentQK: any,
  parent: string,
  child: string,
  path: Path
) {
  if (childs[parent][child].length === 1) {
    delete parents[child][parentQK[0]][parentQK[1]];
    delete childs[parent][child];
  } else {
    parents[child][parentQK[0]][parentQK[1]] = parents[child][parentQK[0]][
      parentQK[1]
    ].filter((p: any) => isSamePath(p, path));
    childs[parent] = childs[parent].filter((p: any) => isSamePath(p, path));
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

export default App;
