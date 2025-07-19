import { g } from "./g";
import { getEvtChanges } from "./getEvtChanges";
import { putToPath } from "./path";
import { qkString } from "./qk";
import { applyRelations } from "./relations";

export function listen(queryClient: any) {
  const addUpdate = (qk: any) => {
    const qkSt = qkString(qk);
    const data = queryClient.getQueryData(qk);
    if (data) g.updates[qkSt] = qk;
  };
  const updateParent = (
    pOrmName: string,
    pQkArgSt: string,
    qk: any,
    arrs: any
  ) => {
    const parents = g.parents[qkString(qk)];
    if (Array.isArray(g.cache[pOrmName][pQkArgSt])) {
      if (!arrs[pOrmName]) arrs[pOrmName] = { [pQkArgSt]: true };
      else arrs[pOrmName][pQkArgSt] = true;
    } else {
      for (let path of parents[pOrmName][pQkArgSt]) {
        g.cache[pOrmName][pQkArgSt] = putToPath(
          g.cache[pOrmName][pQkArgSt],
          g.cache[qk[0]][qk[1]],
          path
        );
      }
      addUpdate([pOrmName, pQkArgSt]);
    }
  };

  return queryClient.getQueryCache().subscribe((event: any) => {
    if (event.type !== "updated" || event.query.state.status !== "success")
      return;

    const st = qkString(event.query.queryKey);
    if (st in g.updates && g.updates[st] !== true) {
      g.updates[st] = true;
      return;
    }

    try {
      g.currentChilds = {};
      g.updates = {};
      g.evtChanges = getEvtChanges(event);

      const configItem = g.config[event.query.queryKey[0]];
      let list;
      if (configItem.many) {
        list = configItem.list(event.query.state.data);
        g.cache[event.query.queryKey[0]][event.query.queryKey[1]] = list;
      }
      applyRelations();
      const arrs = {} as any;

      for (let key in g.evtChanges) {
        const { qk, diff } = g.evtChanges[key];
        if (!g.cache[qk[0]]) g.cache[qk[0]] = {};
        g.cache[qk[0]][qk[1]] = { ...g.cache[qk[0]][qk[1]], ...diff };
        addUpdate(qk);
      }
      for (let key in g.evtChanges) {
        const { qk } = g.evtChanges[key];
        const qkStr = qkString(qk);
        const itemParents = g.parents[qkStr];
        if (itemParents) {
          for (let pOrmName in itemParents) {
            for (let pQkArgSt in itemParents[pOrmName]) {
              const pQk = [pOrmName, pQkArgSt];
              const parentParents = g.parents[qkString(pQk)];

              updateParent(pOrmName, pQkArgSt, qk, arrs);
              if (parentParents) {
                for (let ppOrmName in parentParents) {
                  for (let ppQkArgSt in parentParents[ppOrmName]) {
                    updateParent(ppOrmName, ppQkArgSt, pQk, arrs);
                  }
                }
              }
            }
          }
        }
      }
      for (let ormName in arrs) {
        for (let qkArgSt in arrs[ormName]) {
          const qk = [ormName, qkArgSt];
          const qkSt = qkString(qk);
          const arrChilds = g.childs[qkSt];
          g.cache[ormName][qkArgSt] = [...g.cache[ormName][qkArgSt]];
          g.updates[qkSt] = qk;
          for (let childQKSt in arrChilds) {
            for (let idx of arrChilds[childQKSt]) {
              const childQK = g.qkSt[childQKSt];
              g.cache[ormName][qkArgSt][idx] = g.cache[childQK[0]][childQK[1]];
            }
          }
        }
      }
      for (let qkSt in g.updates) {
        if (qkSt === st) continue;
        const qk = g.updates[qkSt];
        queryClient.setQueryData(
          qk,
          g.config[qk[0]].toRes(
            g.cache[qk[0]][qk[1]],
            queryClient.getQueryData(qk)
          )
        );
      }
    } catch (e) {
      console.log(e);
    }
  });
}
