import { useEffect } from "react";
import { g } from "./g";
import { listen } from "./listen";
import { qkArgString } from "./qk";
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
    const queryFn = "one" in item ? item.one : item.many;
    // @ts-expect-error
    q[key] = (param: any) => {
      const qkArgSt = qkArgString(param);
      const qk = [key, qkArgSt];
      const x = g.cache[key]?.[qkArgSt];
      return {
        queryKey: qk,
        queryFn: () => queryFn(param),
        placeholderData: x && config[key].toPlaceholder(x),
      };
    };
  }
  g.config = config;
  g.orm = orm;
  return { q };
}

export function useReactQueryOrm(queryClient: any) {
  useEffect(() => listen(queryClient), [queryClient]);
}

// DeepPartial для x
export function one<
  One extends (a: any) => any,
  X extends (x: AwaitedReturn<One>) => any,
  Id extends (x: ReturnType<X>) => any,
  ToRes = (x: Partial<ReturnType<X>>, res: AwaitedReturn<One>) => any,
  ToPlaceholder = (x: Partial<ReturnType<X>>) => any
>(one: One, x: X, toRes: ToRes, toPlaceholder: ToPlaceholder, id?: Id) {
  return { one, x, toRes, toPlaceholder, id: id || (defaultId as Id) };
}

export function many<
  Many extends (...args: any[]) => any,
  List extends (res: AwaitedReturn<Many>) => any,
  ToRes extends (list: ReturnType<List>, res: ReturnType<Many>) => any,
  ToPlaceholder = (list: ReturnType<List>) => any
>(many: Many, list: List, toRes: ToRes, toPlaceholder: ToPlaceholder) {
  return { many, list, toPlaceholder, toRes };
}

const defaultId = (x: any) => x?.id;
