import { g } from "./g";
import { extractEvent } from "./extractEvent";
import { putToPath } from "./path";
import { qkString } from "./qk";
import { applyRelations } from "./relations";

export function listen(queryClient: any) {
  let update = {} as any;

  const updateParent = (child: string, parent: string, arrs: any) => {
    if (Array.isArray(g.cache[parent])) {
      arrs[parent] = true;
    } else {
      for (let path of g.parents[child][parent]) {
        g.cache[parent] = putToPath(g.cache[parent], g.cache[child], path);
      }
      update[parent] = true;
    }
  };

  return queryClient.getQueryCache().subscribe((event: any) => {
    if (event.type !== "updated" || event.query.state.status !== "success")
      return;
    const evtSt = qkString(event.query.queryKey);
    if (update[evtSt]) return (update[evtSt] = false);

    try {
      extractEvent(event);
      applyRelations();
      update = {};

      const arrs = {} as any;
      for (let st in g.event.diff) {
        g.cache[st] = {
          ...g.cache[st],
          ...g.event.diff[st],
        };
        update[st] = true;
      }
      for (let st in g.event.diff) {
        const itemParents = g.parents[st];
        if (itemParents) {
          for (let parent in itemParents) {
            updateParent(st, parent, arrs);

            const parentParents = g.parents[parent];
            if (parentParents) {
              for (let parentParent in parentParents) {
                updateParent(parent, parentParent, arrs);
              }
            }
          }
        }
      }
      for (let arrSt in arrs) {
        const arrChilds = g.childs[arrSt];
        g.cache[arrSt] = [...g.cache[arrSt]];
        for (let childSt in arrChilds) {
          if (!update[childSt]) continue;
          for (let i of arrChilds[childSt]) {
            g.cache[arrSt][i] = g.cache[childSt];
          }
        }
      }
      for (let updSt in update) {
        const updQK = g.stQK[updSt];
        if (queryClient.getQueryData(updQK))
          queryClient.setQueryData(
            updQK,
            g.config[updQK[0]].toRes(
              g.cache[updSt],
              queryClient.getQueryData(updQK)
            )
          );
        else delete update[updSt];
      }
    } catch (e) {
      console.log(e);
    }
  });
}
