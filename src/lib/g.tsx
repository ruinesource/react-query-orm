export const listSym = Symbol("list");
export const orderSym = Symbol("order");

const g = {
  cache: {},
  parents: {},
  childs: {},
  evtChanges: { [listSym]: {} },
  currentChilds: {},
  qkSt: {},
} as any;

console.log(g);

export default g;
