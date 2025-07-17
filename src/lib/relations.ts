import { g } from "./g";
import { hasPath, isSameChildInPath, isSamePath, Path } from "./path";
import { qkArgString } from "./qk";

export function addRelation(parent: string, child: string, path: Path) {
  if (!hasPath(g.currentChilds[parent]?.[child] || [], path)) {
    if (!g.currentChilds[parent]) {
      g.currentChilds[parent] = { [child]: [path] };
    } else if (!g.currentChilds[parent][child]) {
      g.currentChilds[parent][child] = [path];
    } else g.currentChilds[parent][child].push(path);
  }
}

export function applyRelations() {
  for (let parent in g.currentChilds) {
    for (let child in g.childs[parent]) {
      const prevPaths = g.childs[parent]?.[child];
      if (!prevPaths) continue;

      for (let prevPath of prevPaths) {
        if (!isSameChildInPath(parent, prevPath)) {
          removeRelation(parent, child, prevPath);
        }
      }
    }
    for (let child in g.currentChilds[parent]) {
      for (let path of g.currentChilds[parent][child]) {
        applyRelation(parent, child, path);
      }
    }
  }
}

export function applyRelation(parent: string, child: string, path: Path) {
  if (hasPath(g.childs[parent]?.[child] || [], path)) return;
  if (!g.parents[child]) g.parents[child] = {};
  const parentQK = g.qkSt[parent];
  const pOrm = parentQK[0];
  const pQKArg = parentQK[1];
  const qkArgSt = qkArgString(pQKArg);
  const pId = g.cache[pOrm]?.[qkArgSt] ? qkArgSt : parentQK[1];
  if (!g.parents[child][pOrm]) g.parents[child][pOrm] = {};
  if (!g.parents[child][pOrm][pId]) g.parents[child][pOrm][pId] = [path];
  else g.parents[child][pOrm][pId].push(path);

  if (!g.childs[parent]) g.childs[parent] = {};
  if (!g.childs[parent][child]) g.childs[parent][child] = [path];
  else g.childs[parent][child].push(path);
}

export function removeRelation(parent: string, child: string, path: Path) {
  if (!g.childs[parent]?.[child]) return;
  const parentQK = g.qkSt[parent];
  const qkArgSt = qkArgString(parentQK[1]);
  const pId = g.cache[parentQK[0]]?.[qkArgSt] ? qkArgSt : parentQK[1];
  if (g.childs[parent][child].length === 1) {
    delete g.parents[child][parentQK[0]][pId];
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
    g.parents[child][parentQK[0]][pId] = g.parents[child][parentQK[0]][
      pId
    ].filter((p: any) => !isSamePath(p, path));
    g.childs[parent][child] = g.childs[parent][child].filter(
      (p: any) => !isSamePath(p, path)
    );
  }
}
