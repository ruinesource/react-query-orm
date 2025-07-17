// import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  config,
  getHost,
  getVm,
  getClusters,
  getCluster,
  getClusterss,
} from "./orm";
import { queryClient } from ".";
import g, { orderSym } from "./lib/g";
import { getEvtChanges, qkString, applyRelations, qkArgString } from "./lib";
import { useTest } from "./test";
import { useQuery } from "@tanstack/react-query";

function App() {
  useTest();
  // useQuery({
  //   queryKey: ["cluster", "1"],
  //   queryFn: async () => {
  //     return getCluster("1");
  //   },
  // });
  // useQuery({
  //   queryKey: ["host", "1"],
  //   queryFn: async () => {
  //     await delay(200);
  //     return getHost("1");
  //   },
  // });
  // useQuery({
  //   queryKey: ["cluster", "1"],
  //   queryFn: async () => {
  //     await delay(800);
  //     return getCluster("1");
  //   },
  // });
  // useQuery({
  //   queryKey: ["host", "1"],
  //   queryFn: async () => {
  //     await delay(100);
  //     return getHost("1");
  //   },
  // });
  // useQuery({
  //   queryKey: ["vm", "1"],
  //   queryFn: async () => {
  //     await delay(500);
  //     const vm = await getVm("1");
  //     return vm;
  //   },
  // });
  // useQuery({
  //   queryKey: ["clusters"],
  //   queryFn: async () => {
  //     await delay(200);
  //     return getClusters();
  //   },
  //   staleTime: 0,
  //   gcTime: 0,
  // });
  // const [enabled, setEnabled] = useState(false);
  // useQuery({
  //   queryKey: ["clusters"],
  //   queryFn: async () => {
  //     await delay(400);
  //     return getClusterss();
  //   },
  //   staleTime: 10,
  //   gcTime: 0,
  //   enabled,
  // });
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
        g.currentChilds = {};
        g.evtChanges = getEvtChanges(event);

        // @ts-expect-error
        const configItem = config[event.query.queryKey[0]];
        let list;
        if (configItem.many) {
          list = configItem.list(event.query.state.data);
          g.cache[event.query.queryKey[0]][
            qkArgString(event.query.queryKey[1])
          ] = list;
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
                  cacheItems.push(getByPath(parentCacheItem, path));
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
            // @ts-expect-error
            const rqData = config[qk[0]].put(cacheItems[0], data);
            queryClient.setQueryData(qk, rqData);
          } else g.evtChanges[key].updated = true;
        }
        for (let ormName in arrs) {
          for (let qkArgSt in arrs[ormName]) {
            // тонкое место, нужно наладить
            const arrChilds =
              g.childs[
                `"${ormName}"|${qkArgSt !== "undefined" ? `${qkArgSt}|` : ""}`
              ];
            for (let childQKSt in arrChilds) {
              for (let idx of arrChilds[childQKSt]) {
                const childQK = g.qkSt[childQKSt];
                g.cache[ormName][qkArgSt][idx] =
                  g.cache[childQK[0]][childQK[1]];
              }
            }
          }
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
  const inst = path.reduce((current: any, key: any) => current[key], parent);
  return Array.isArray(inst) ? [...inst] : { ...inst };
}

function putToPath(parent: any, child: any, path: any): any {
  const key = path[0];

  const parentChild =
    path.length === 1 ? child : putToPath(parent[key], child, path.slice(1));
  return Array.isArray(parent)
    ? parent.map((x, i) => (i === +key ? parentChild : x))
    : {
        ...parent,
        [key]: parentChild,
      };
}
