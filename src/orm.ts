import { AwaitedReturn, Config, OneOrMany } from "./t";

// one должны быть сигнатуры id-params
// many - просто params

// DeepPartial для x
export function one<
  One extends (...args: any[]) => any,
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

function orm<C extends Config, K extends keyof C = keyof C>(
  config: C,
  orm: {
    [P in K]: OneOrMany<C, K, P>;
  },
  queryClient: any
) {
  // const placeholders = {};
  // можно передавать в хуки, можно в мутации
  const q: {
    [P in K]: (...args: any) => {
      queryKey: (...args: any[]) => any;
      queryFn: (...args: any[]) => any;
      placeholderData: (...args: any[]) => any;
    };
  } = {} as any;

  for (let key in config) {
    const item = config[key];
    if ("one" in item) {
      // @ts-expect-error
      q[key] = (id: string) => {
        return {
          queryKey: [key, id],
          // вместо any
          queryFn: (...args: any[]) => item.one(id, ...args),
          placeholderData: () => queryClient.getQueryData(key),
        };
      };
    } else if ("many" in item) {
      // @ts-expect-error
      q[key] = () => ({
        queryKey: () => [key],
        queryFn: item.many,
      });
    } else {
      // @ts-expect-error
      q[key] = (id: string) => ({
        queryKey: () => [key, id],
        queryFn: (...args: any[]) => [id, ...args],
      });
    }
  }

  return { q, ormm: orm };
}

export const config = {
  cluster: one(
    getCluster,
    (res) => res.data,
    (x, res) => ({ data: { ...res.data, ...x } }),
    (x) => x.id
  ),
  clusters: many(
    getClusters,
    (res) => res.data,
    (data) => ({ data: { data } })
  ),
  host: one(
    getHost,
    (res) => res.data,
    (x, res) => ({ data: { ...res.data, ...x } }),
    (x) => x.id
  ),
  localStorages: many(
    getLocalStorages,
    (res) => res.data,
    (res, data) => ({ data })
  ),
  vm: one(
    getVm,
    (res) => res.data,
    (x, res) => ({ data: { ...res.data, ...x } }),
    (x) => x.id
  ),
  inner: one(
    getInner,
    (res) => res,
    (x) => x,
    (x) => x.id
  ),
};

export const { q, ormm } = orm(
  config,
  {
    cluster: {
      host: "host",
      vms: (x) => ["vm", x.id],
      deep: {
        host: "host",
        arr: (x) => ["inner", x.id],
      },
      very: {
        deep: {
          host: "host",
          arr: (x) => ["inner", x.id],
        },
      },
    },
    host: {
      cluster: "cluster",
      vm: "vm",
      vms: (x) => ["vm", x.id],
      deep: {
        very: {
          inner: "inner",
        },
      },
    },
    vm: {
      cluster: "cluster",
      host: "host",
    },
    inner: {},
    clusters: (x) => ["cluster", x.id],
  },
  null
);

export function getClusters() {
  return Promise.resolve({
    data: [{ oki: "doki", id: "1", vms: [{ id: "1", e: "a" }] }],
  });
}

export function getClusterss() {
  return Promise.resolve({
    data: [
      { oki: "doki", id: "1", vms: [{ id: "1" }] },
      { oki: "doki", id: "2", vms: [{ id: "1" }] },
    ],
  });
}

export function getCluster(id: string) {
  return Promise.resolve({
    data: {
      e: "cluster",
      vms: [
        { id: "1", e: "vm" },
        { id: "2", e: "vm2" },
      ],
      host: {
        id: "1",
        e: "host",
        vm: { id: "1", e: "vm" },
        vms: [
          { id: "1", e: "vm" },
          { id: "2", e: "vm2" },
        ],
      },
      deep: {
        e: "deep",
        host: { id: "2", e: "host2" },
        arr: [
          { id: "1", e: "inner" },
          { id: "2", e: "inner2" },
          { id: "3", e: "inner3" },
        ],
      },
      very: {
        deep: {
          host: { id: "1", e: "host" },
          arr: [
            { id: "3", e: "inner3" },
            { id: "2", e: "inner2" },
            { id: "1", e: "inner" },
          ],
        },
      },
      id,
    },
  });
}

export function getHost(id: string) {
  return Promise.resolve({
    data: {
      id,
      host: "host_2",
      e: "host_2",
      vm: {
        id: "1",
        e: "vm_2",
        vm: "vm_2",
      },
      vms: [{ id: "100" }],
      deep: {
        very: {
          inner: { id: "100" },
        },
      },
      cluster: {
        id: "1",
        e: "cluster_2",
        cluster: "cluster_2",
        vms: [
          { id: "2", e: "vm2_2", vm: "vm_2" },
          { id: "1", e: "vm_2", vm: "vm_2" },
        ],
        host: { id: "3", e: "host3_2" },
        deep: {
          e: "deep_2",
          arr: [
            { id: "3", e: "inner3_2" },
            { id: "1", e: "inner_2" },
          ],
        },
        very: {
          deep: {
            host: { id: "2" },
            arr: [{ id: "1", e: "inner_2" }],
          },
        },
      },
    },
  });
}

function getInner() {
  return { id: "1", e: "inner" };
}
// export function getCluster(id: string) {
//   return Promise.resolve({
//     data: {
//       e: "cluster",
//       vms: [
//         { id: "1", e: "vm" },
//         { id: "2", e: "vm2" },
//       ],
//       host: { id: "1", e: "host" },
//       id,
//     },
//   });
// }

// export function getHost(id: string) {
//   return Promise.resolve({
//     data: {
//       e: "host",
//       id,
//       vm: { id: "1", e: "vm" },
//       cluster: { id: "1", vms: [{ id: "1", e: "vm" }, { id: "2" }] },
//     },
//   });
// }

export function getVm(id: string) {
  return Promise.resolve({
    data: {
      e: "vmm",
      id,
      cluster: { id: "1" },
      host: { id: "1", e: "hostt" },
    },
  });
}

export function getLocalStorages(hostId: string) {
  return Promise.resolve({
    data: { e: "d" },
  });
}

const defaultId = (x: any) => x?.id;
