export type AwaitedReturn<T> = T extends (...args: any[]) => Promise<infer R>
  ? R
  : T extends (...args: any[]) => infer R
  ? R
  : never;

type RecordKey = string | number | symbol;

export type Config = Record<RecordKey, ConfigItem>;

type ConfigItem =
  | { one: (...args: any[]) => any; x: (arg: any) => any }
  | { many: (...args: any[]) => any };

type OneXResult<T> = T extends { x: (arg: any) => any }
  ? ReturnType<T["x"]>
  : never;

type ListItem<T> = T extends { list: (arg: any) => any }
  ? ReturnType<T["list"]>
  : never;

type Child<T> = T extends (infer U)[] ? U : never;

type ManyFn<C extends Config, K extends keyof C> = (
  item: Child<ListItem<C[K]>>
) => [keyof C, RecordKey];

type ListMapper<C extends Config, T> = (arg: Child<T>) => [keyof C, RecordKey];

type ReplaceWithK<
  T,
  C extends Config,
  AllKeys extends keyof C = keyof C
> = T extends object
  ? AllKeys | ListMapper<C, T> | PartialWithKeysReplacing<T, C>
  : AllKeys | ListMapper<C, T>;

type PartialWithKeysReplacing<T, C extends Config> = {
  [K in keyof T]?: ReplaceWithK<T[K], C, K>;
};

export type OneOrMany<
  C extends Config,
  AllKeys extends keyof C,
  K extends AllKeys
> = C[K] extends { one: (...args: any[]) => any; x: (arg: any) => any }
  ? PartialWithKeysReplacing<OneXResult<C[K]>, C>
  : ManyFn<C, K>;
