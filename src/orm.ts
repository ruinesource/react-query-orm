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
};

export const { q, ormm } = orm(
  config,
  {
    cluster: {
      host: "host",
      vms: (x) => ["vm", x.id],
    },
    host: {
      cluster: "cluster",
      vm: "vm",
    },
    vm: {
      cluster: "cluster",
      host: "host",
    },
    clusters: (x) => ["cluster", x.id],
  },
  null
);

export function getClusters() {
  return Promise.resolve({
    data: [{ oki: "doki", id: "1", vms: [{ id: "1" }] }],
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
      host: { id: "1", e: "host" },
      id,
    },
  });
}

export function getHost(id: string) {
  return Promise.resolve({
    data: {
      e: "host",
      id,
      vm: { id: "1", e: "vm" },
      cluster: { id: "1", vms: [{ id: "1", e: "vm" }, { id: "2" }] },
    },
  });
}

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
