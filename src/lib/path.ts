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
