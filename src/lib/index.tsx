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
      q[key] = (params) => ({
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
  Put = (x: Partial<ReturnType<X>>, res: AwaitedReturn<One>) => any
>(one: One, x: X, put?: Put, id?: Id) {
  return { one, x, put, id: id || (defaultId as Id) };
}

export function many<
  Many extends (...args: any[]) => any,
  List extends (res: AwaitedReturn<Many>) => any,
  ToRes extends (list: ReturnType<List>, res: ReturnType<List>) => any
>(many: Many, list: List, toRes: ToRes) {
  return { many, list, toRes };
}

function sub(config: any, queryClient: any) {
  return queryClient.getQueryCache().subscribe((event: any) => {
    if (event.type !== "updated" || event.query.state.status !== "success")
      return;

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
          for (let ormName in itemParents) {
            for (let id in itemParents[ormName]) {
              const parentCacheItem = g.cache[ormName]?.[id];
              if (Array.isArray(g.cache[ormName]?.[id])) continue;
              if (!parentCacheItem) continue;
              for (let path of itemParents[ormName][id]) {
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
          for (let parentOrmName in itemParents) {
            for (let qkArgSt in itemParents[parentOrmName]) {
              if (Array.isArray(g.cache[parentOrmName][qkArgSt])) {
                if (!arrs[parentOrmName])
                  arrs[parentOrmName] = { [qkArgSt]: true };
                else arrs[parentOrmName][qkArgSt] = true;
                continue;
              } else {
                for (let id in itemParents[parentOrmName]) {
                  for (let path of itemParents[parentOrmName][id]) {
                    g.cache[parentOrmName][id] = putToPath(
                      g.cache[parentOrmName][id],
                      cacheItems[0],
                      path
                    );
                  }
                }
              }
            }
          }
        }

        const data = queryClient.getQueryData(qk);
        if (data && qkStr !== st) {
          const rqData = config[qk[0]].put(cacheItems[0], data);
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
