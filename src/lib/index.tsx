import { g, orderSym } from "./g";
import { getEvtChanges } from "./getEvtChanges";
import { clonePath, putToPath } from "./path";
import { qkArgString, qkString } from "./qk";
import { applyRelations } from "./relations";
import { AwaitedReturn, Config, OneOrMany, QObj } from "./t";

export function reactQueryOrm<C extends Config, K extends keyof C = keyof C>(
  config: C,
  orm: {
    [P in K]: OneOrMany<C, K, P>;
  }
) {
  const q: {
    [P in K]: QObj<C, P>;
  } = {} as any;

  for (let key in config) {
    const item = config[key];
    if ("one" in item) {
      // @ts-expect-error
      q[key] = (param: any) => {
        return {
          queryKey: [key, param],
          queryFn: () => item.one(param),
          placeholderData: g.cache[key[0]]?.[key[1]],
        };
      };
    } else {
      // @ts-expect-error
      q[key] = (params: any) => ({
        queryKey: [key, params],
        queryFn: item.many,
      });
    }
  }

  g.config = config;
  g.orm = orm;
  return {
    q,
    sub: (queryClient: any) => sub(config, queryClient),
  };
}

// DeepPartial для x
export function one<
  One extends (a: any) => any,
  X extends (x: AwaitedReturn<One>) => any,
  Id extends (x: ReturnType<X>) => any,
  ToRes = (x: Partial<ReturnType<X>>, res: AwaitedReturn<One>) => any
>(one: One, x: X, toRes?: ToRes, id?: Id) {
  return { one, x, toRes, id: id || (defaultId as Id) };
}

export function many<
  Many extends (...args: any[]) => any,
  List extends (res: AwaitedReturn<Many>) => any,
  ToRes extends (list: ReturnType<List>, res: ReturnType<Many>) => any
>(many: Many, list: List, toRes: ToRes) {
  return { many, list, toRes };
}

function sub(config: any, queryClient: any) {
  return queryClient.getQueryCache().subscribe((event: any) => {
    if (event.type !== "updated" || event.query.state.status !== "success")
      return;
    console.log("oke");

    const st = qkString(event.query.queryKey);
    if (g.evtChanges[st] && !g.evtChanges[st].updated) {
      g.evtChanges[st].updated = true;
      return;
    }

    try {
      g.currentChilds = {};
      g.evtChanges = getEvtChanges(event);

      const configItem = config[event.query.queryKey[0]];
      let list;
      if (configItem.many) {
        list = configItem.list(event.query.state.data);
        g.cache[event.query.queryKey[0]][qkArgString(event.query.queryKey[1])] =
          list;
      }
      applyRelations();
      const arrs = {} as any;

      for (let key of g.evtChanges[orderSym]) {
        const { qk, diff } = g.evtChanges[key];
        const qkStr = qkString(qk);
        if (!g.cache[qk[0]]) g.cache[qk[0]] = {};
        g.cache[qk[0]][qk[1]] = { ...g.cache[qk[0]][qk[1]] };
        const cacheItems = [g.cache[qk[0]][qk[1]]];

        const itemParents = g.parents[qkStr];
        if (itemParents) {
          for (let pOrmName in itemParents) {
            for (let pQkArgSt in itemParents[pOrmName]) {
              const parentCacheItem = g.cache[pOrmName]?.[pQkArgSt];
              if (Array.isArray(g.cache[pOrmName]?.[pQkArgSt])) continue;
              if (!parentCacheItem) continue;
              for (let path of itemParents[pOrmName][pQkArgSt]) {
                cacheItems.push(clonePath(parentCacheItem, path));
              }
            }
          }
        }

        for (let keyt in diff) {
          const key = keyt as keyof typeof diff;
          cacheItems.forEach((x) => (x[key] = diff[key]));
        }
      }
      for (let i = g.evtChanges[orderSym].length - 1; i >= 0; i--) {
        const key = g.evtChanges[orderSym][i];
        const { qk } = g.evtChanges[key];
        const qkStr = qkString(qk);
        const cacheItems = [g.cache[qk[0]][qk[1]]];
        const itemParents = g.parents[qkStr];

        if (itemParents) {
          for (let pOrmName in itemParents) {
            for (let pQkArgSt in itemParents[pOrmName]) {
              if (Array.isArray(g.cache[pOrmName][pQkArgSt])) {
                if (!arrs[pOrmName]) arrs[pOrmName] = { [pQkArgSt]: true };
                else arrs[pOrmName][pQkArgSt] = true;
                continue;
              } else {
                for (let id in itemParents[pOrmName]) {
                  for (let path of itemParents[pOrmName][id]) {
                    g.cache[pOrmName][id] = putToPath(
                      g.cache[pOrmName][id],
                      cacheItems[0],
                      path
                    );
                  }
                }
              }
              const pQkSt = qkString([pOrmName, pQkArgSt]);
              const parentParents = g.parents[pQkSt];
              if (parentParents) {
                for (let ppOrmName in parentParents) {
                  for (let ppQkArgSt in parentParents[ppOrmName]) {
                    if (Array.isArray(g.cache[ppOrmName][ppQkArgSt])) {
                      if (!arrs[ppOrmName])
                        arrs[ppOrmName] = { [ppQkArgSt]: true };
                      else arrs[ppOrmName][ppQkArgSt] = true;
                    } else {
                      for (let path of parentParents[ppOrmName][ppQkArgSt]) {
                        g.cache[ppOrmName][ppQkArgSt] = putToPath(
                          g.cache[ppOrmName][ppQkArgSt],
                          g.cache[pOrmName][pQkArgSt],
                          path
                        );
                        // const data = queryClient.getQueryData(qk);
                        // const ppQkSt = qkString([ppOrmName, ppQkArgSt]);
                        // if (data && ppQkSt !== st) {
                        // const rqData = config[qk[0]].toRes(
                        //   cacheItems[0],
                        //   data
                        // );
                        // queryClient.setQueryData(qk, rqData);
                        // if (!g.evtChanges[ppQkSt]) {
                        //   g.evtChanges[ppQkSt] = { updated: false };
                        // }
                        // } else g.evtChanges[key].updated = true;
                      }
                    }
                  }
                }
              }
            }
          }
        }

        const data = queryClient.getQueryData(qk);
        if (data && qkStr !== st) {
          const rqData = config[qk[0]].toRes(cacheItems[0], data);
          queryClient.setQueryData(qk, rqData);
        } else g.evtChanges[key].updated = true;
      }
      for (let ormName in arrs) {
        for (let qkArgSt in arrs[ormName]) {
          const arrChilds =
            g.childs[
              `"${ormName}"|${qkArgSt !== "undefined" ? `${qkArgSt}|` : ""}`
            ];
          for (let childQKSt in arrChilds) {
            for (let idx of arrChilds[childQKSt]) {
              const childQK = g.qkSt[childQKSt];
              // todo: свежий массив + подстановка его в rqData через toRes
              g.cache[ormName][qkArgSt][idx] = g.cache[childQK[0]][childQK[1]];
            }
          }
        }
      }
    } catch (e) {
      console.log(e);
    }
  });
}

const defaultId = (x: any) => x?.id;
