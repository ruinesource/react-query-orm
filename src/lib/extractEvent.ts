import { g } from "./g";
import { getPath } from "./path";
import { qkArgString, qkString } from "./qk";
import { addRelation, removeRelation } from "./relations";

export function extractEvent(event: any) {
  const { queryKey, state } = event.query;
  g.event = { diff: {}, child: {} };

  const item = g.config[queryKey[0]];
  if (item.many) setList(queryKey, item.list(state.data));
  else setQK(queryKey, item.x(state.data));

  return g.event;
}

function setQK(qk: any[], diff: any) {
  const st = qkString(qk);
  g.stQK[st] = qk;

  if (!g.event.diff[st]) {
    g.event.diff[st] = diff;
  } else
    g.event.diff[st] = {
      ...g.event.diff[st],
      ...diff,
    };
  const deps = g.orm[qk[0]];
  if (deps) applyDeps(qk, deps, diff);
}

function setList(qk: any, list: any) {
  const st = qkString(qk);
  g.stQK[st] = qk;
  if (!g.cache[st]) g.cache[st] = list;

  for (let i = 0; i < list.length; i++) {
    const x = list[i];
    const itemQK = g.orm[qk[0]](x);
    itemQK[1] = qkArgString(itemQK[1]);
    const childSt = qkString(itemQK);
    addRelation(st, childSt, [i]);
    setQK(itemQK, x);
  }
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
    const childArgString = qkArgString(g.config[dep].id(diff));
    const childQK = [dep, childArgString];
    addChildDiff(qk, childQK, diff, path);
  } else if (typeof dep === "function") {
    addChildArrayDiffs(qk, diff, dep, path);
  }
}

function addChildDiff(qk: any, childQK: any, childDiff: any, path: any[]) {
  const st = qkString(qk);
  const childSt = qkString(childQK);
  addRelation(st, childSt, path);
  setQK(childQK, childDiff);
}

function addChildArrayDiffs(qk: any, childDiff: any, dep: any, path: any[]) {
  for (let i = 0; i < childDiff.length; i++) {
    const itemQK = dep(childDiff[i]);
    itemQK[1] = qkArgString(itemQK[1]);
    addChildDiff(qk, itemQK, childDiff[i], [...path, i]);
  }
  const st = qkString(qk);
  const prev = getPath(g.cache[st], path);
  if ((prev?.length || 0) > childDiff.length) {
    for (let i = childDiff.length; i < prev.length; i++) {
      const childQK = dep(prev[i]);
      childQK[1] = qkArgString(childQK[1]);
      removeRelation(st, qkString(childQK), [...path, i]);
    }
  }
}
