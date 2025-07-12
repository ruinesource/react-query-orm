export const listSym = Symbol("list");
export const orderSym = Symbol("order");
export const parentQKSym = Symbol("parentQK");

const g = {
  cache: {},
  parents: {},
  childs: {},
  evtChanges: { [listSym]: {} },
  currentChilds: { [parentQKSym]: {} },
} as any;

console.log(g);

export default g;
