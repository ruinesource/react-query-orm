export type AwaitedReturn<T> = T extends (...args: any[]) => Promise<infer R>
  ? R
  : T extends (...args: any[]) => infer R
  ? R
  : never;

export type ConfigItem =
  | { one: (...args: any[]) => any; x: (arg: any) => any }
  | { many: (...args: any[]) => any }
  | ((...args: any[]) => any);

export type RecordKey = string | number | symbol;

export type Config = Record<RecordKey, ConfigItem>;

export type OneXResult<T> = T extends { x: (arg: infer R) => any }
  ? ReturnType<T["x"]>
  : never;

export type ItemResult<T> = T extends typeof one
  ? never
  : T extends { x: (arg: any) => any }
  ? ReturnType<T["x"]>
  : T extends (...args: any[]) => any
  ? AwaitedReturn<T>
  : never;

export type Item<C extends Config> = {
  [P in keyof C]: C[P] extends { x: (arg: any) => any }
    ? Partial<ReturnType<C[P]["x"]>>
    : C[P] extends (...args: any[]) => any
    ? Partial<AwaitedReturn<C[P]>>
    : never;
};

export type ManyReturn<C, K extends keyof C> = C[K] extends {
  many: (...args: any[]) => any;
}
  ? AwaitedReturn<C[K]["many"]>
  : C[K] extends (...args: any[]) => any
  ? AwaitedReturn<C[K]>
  : never;

export type ManyFn<C extends Config, K extends keyof C> = (
  res: ManyReturn<C, K>
) => Partial<{
  [P in keyof C]?: Record<RecordKey, Item<C>[P]>;
}>;

export type ItemsOrManyFn<
  C extends Config,
  K extends keyof C
> = "one" extends keyof C[K]
  ? Record<RecordKey, Item<C>[K]>
  : (res: ManyReturn<C, K>) => ManyReturn<C, K>;

export type OneOrMany<
  C extends Config,
  AllKeys extends keyof C,
  K extends AllKeys
> = C[K] extends { one: (...args: any[]) => any; x: (arg: any) => any }
  ? (x: OneXResult<C[K]>) => Partial<{
      [P in keyof C]?: ItemsOrManyFn<C, P>;
    }>
  : ManyFn<C, K>;

export function getClusters() {
  return Promise.resolve({
    data: [{ oki: "doki", id: 1 }],
  });
}

export function getVm(id: number) {
  return Promise.resolve({
    data: { e: "d", id },
  });
}

export function getLocalStorages(branchId: number) {
  return Promise.resolve({
    data: { e: "d" },
  });
}

const defaultId = (x: any) => x?.id;

// one должны быть сигнатуры id-params
// many - просто params

// DeepPartial для x
export function one<
  One extends (...args: any[]) => any,
  X extends (x: AwaitedReturn<One>) => any,
  Id extends (x: ReturnType<X>) => any,
  Put = (res: AwaitedReturn<One>, x: Partial<ReturnType<X>>) => any
>(one: One, x: X, put?: Put, id?: Id) {
  return { one, x, put, id: id || (defaultId as Id) };
}

function branch<
  Many extends (...args: any[]) => any,
  Branch extends (params: Parameters<Many>[0]) => string | number
>(many: Many, branch: Branch) {
  return {
    many,
    branch,
  };
}
// useQ.user(id)
// useQ.clusters({ limit: 500, offset: 300 })
// useQ.localStorages({ hostId, another })
function orm<C extends Config, K extends keyof C = keyof C>(
  config: C,
  orm: {
    [P in K]: OneOrMany<C, K, P>;
  },
  queryClient: any
) {
  //   const placeholders = {};

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
      //   const subscribedIds = {} as any;
      // @ts-expect-error
      q[key] = (id: string) => {
        //   if (!subscribedIds[`${key}-${id}`]) {
        //     subscribeOne(queryClient, key, id);
        //   }
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
        queryFn: (...args: any[]) => item(id, ...args),
      });
    }
  }
  //   queryClient.getQueryCache().subscribe((event: any) => {
  //     if (
  //       event.type === "updated" &&
  //       queryClient.getQueryData([key, id]) === event.query.state.data
  //     ) {
  //       console.log(event.query.queryKey);
  //     }
  //   });
  return { q, ormm: orm };
}

export const config = {
  cluster: one(
    getCluster,
    (res) => res.data,
    (res, x) => ({ data: { ...res.data, ...x } }),
    (x) => x.id
  ),
  clusters: getClusters,
  localStorages: branch(getLocalStorages, (hostId) => hostId),
  vm: one(
    getVm,
    (res) => res.data,
    (res, x) => ({ data: { ...res.data, ...x } }),
    (x) => x.id
  ),
};

export const { q, ormm } = orm(
  config,
  {
    cluster: (x) => ({
      vm: {
        [x.vm.id]: x.vm,
      },
      clusters: (res) => ({
        ...res,
        data: res.data.map((y) => (y.id === x.id ? { ...y, ...x } : y)),
      }),
    }),
    clusters: (res) => ({
      cluster: res.data.reduce((acc, x) => {
        acc[x.id] = x;
        return acc;
      }, {} as Record<string, any>),
    }),
  },
  null
);

export function getCluster(id: number) {
  return Promise.resolve({
    data: {
      oki: "doki",
      vm: { id: 1, e: "d" },
      id,
    },
  });
}
