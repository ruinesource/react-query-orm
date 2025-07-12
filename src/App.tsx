import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  config,
  ormm,
  getHost,
  getVm,
  getClusters,
  getCluster,
  getClusterss,
} from "./orm";
import { queryClient } from ".";
import g, { orderSym, parentQKSym } from "./lib/g";
import { getEvtChanges, qkString, rmOutdatedRelations } from "./lib";

function App() {
  const c = useQuery({
    queryKey: ["cluster", "1"],
    queryFn: async () => {
      await delay(800);
      return getCluster("1");
    },
  });
  // const r = useQuery({
  //   queryKey: ["host", "1"],
  //   queryFn: async () => {
  //     await delay(100);
  //     return getHost("1");
  //   },
  // });
  // const e = useQuery({
  //   queryKey: ["vm", "1"],
  //   queryFn: async () => {
  //     await delay(500);
  //     const vm = await getVm("1");
  //     return vm;
  //   },
  // });
  // const s = useQuery({
  //   queryKey: ["clusters"],
  //   queryFn: async () => {
  //     await delay(200);
  //     return getClusters();
  //   },
  //   staleTime: 0,
  //   gcTime: 0,
  // });
  // const [enabled, setEnabled] = useState(false);
  const j = useQuery({
    queryKey: ["clusters"],
    queryFn: async () => {
      await delay(400);
      return getClusterss();
    },
    staleTime: 10,
    gcTime: 0,
    // enabled,
  });
  // useEffect(() => {
  //   setTimeout(() => setEnabled(true), 500);
  // }, []);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.query.state.status !== "success")
        return;

      const st = qkString(event.query.queryKey);
      if (g.evtChanges[st] && !g.evtChanges[st].updated) {
        g.evtChanges[st].updated = true;
        return;
      }

      try {
        g.currentChilds = { [parentQKSym]: {} };
        g.evtChanges = getEvtChanges(event);

        // @ts-expect-error
        const configItem = config[event.query.queryKey[0]];
        let list;
        if (configItem.many) {
          list = configItem.list(event.query.state.data);
          g.cache[event.query.queryKey[0]] = list;
        }
        rmOutdatedRelations(st, list);

        for (let key of g.evtChanges[orderSym]) {
          const { qk, diff } = g.evtChanges[key];
          const qkStr = qkString(qk);

          if (!g.cache[qk[0]]) g.cache[qk[0]] = {};
          g.cache[qk[0]][qk[1]] = { ...g.cache[qk[0]][qk[1]] };
          const cacheItems = [g.cache[qk[0]][qk[1]]];

          const itemParents = g.parents[qkStr];
          if (itemParents) {
            for (let ormName in itemParents) {
              if (Array.isArray(g.cache[ormName])) continue;
              else {
                for (let id in itemParents[ormName]) {
                  const parentCacheItem = g.cache[ormName]?.[id];
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
        }
        for (let i = g.evtChanges[orderSym].length - 1; i >= 0; i--) {
          const key = g.evtChanges[orderSym][i];
          const { qk } = g.evtChanges[key];
          const qkStr = qkString(qk);
          const cacheItems = [g.cache[qk[0]][qk[1]]];
          const itemParents = g.parents[qkStr];

          if (itemParents) {
            for (let ormName in itemParents) {
              if (Array.isArray(g.cache[ormName])) {
                for (let path of itemParents[ormName]) {
                  g.cache[ormName] = putToPath(
                    g.cache[ormName],
                    cacheItems[0],
                    path
                  );
                }
              } else {
                for (let id in itemParents[ormName]) {
                  for (let path of itemParents[ormName][id]) {
                    g.cache[ormName][id] = putToPath(
                      g.cache[ormName][id],
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
          } else g.evtChanges[key].updated = true;
        }
      } catch (e) {
        console.log(e);
      }
    });
    return unsubscribe;
  }, []);
  return <></>;
}

export default App;

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
